const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callProcedureWithOut } = require('../lib/sp-helper');

function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


// Create booking -> uses CreateBooking with many params and OUT p_booking_id
router.post('/', async (req, res) => {
  const body = req.body;
  // required: customer_user_id and either event_id or service_id depending on booking_type
  try {
    const sql = `CALL CreateBooking(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @new_booking_id); SELECT @new_booking_id as booking_id;`;
    const params = [
      body.customer_user_id || null,
      body.event_id || null,
      body.service_id || null,
      body.event_date || null,
      body.total_members || 0,
      body.veg_guests || 0,
      body.non_veg_guests || 0,
      body.booking_type || 'service_booking',
      body.primary_chef_user_id || null,
      body.alternate_chef1_user_id || null,
      body.alternate_chef2_user_id || null,
      body.primary_vendor_user_id || null,
      body.alternate_vendor1_user_id || null,
      body.alternate_vendor2_user_id || null
    ];
    const results = await callProcedureWithOut(sql, params, 'booking_id');
    const out = Array.isArray(results) ? results[1] && results[1][0] : null;
    const bookingId = out ? out.booking_id : null;

    if (bookingId) {
      const orderId = generateOrderId();
      // Store checkout contact details in orders table
      const { customer_name, customer_email, customer_mobile, customer_address } = body;
      
      await pool.query(
        `INSERT INTO orders (
          order_id, booking_id, customer_name, customer_email, customer_mobile, customer_address, 
          order_value, payment_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId, bookingId, 
          customer_name || null, 
          customer_email || null, 
          customer_mobile || null, 
          customer_address || null, 
          0, 'pending'
        ]
      );
      // SENDING order_id BACK TO FRONTEND
      res.json({ success: true, booking_id: bookingId, order_id: orderId });
    } else {
      res.json({ success: true, booking_id: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add menu item to booking -> AddMenuItemToBooking
router.post('/:bookingId/menu-items', async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { menu_item_id, quantity, price } = req.body;
  if (!bookingId || quantity == null || price == null) return res.status(400).json({ error: 'bookingId, quantity, price required' });
  try {
    await pool.query('CALL AddMenuItemToBooking(?, ?, ?, ?)', [bookingId, menu_item_id, quantity, price]);
    
    // Update order_value in orders table
    const itemTotal = quantity * price;
    await pool.query(
      'UPDATE orders SET order_value = order_value + ?, updated_at = NOW() WHERE booking_id = ?',
      [itemTotal, bookingId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RespondToBooking
router.post('/respond', async (req, res) => {
  const { booking_id, user_id, role, acceptance_status, comments } = req.body;
  if (!booking_id || !user_id || !role || !acceptance_status) return res.status(400).json({ error: 'booking_id, user_id, role, acceptance_status required' });
  try {
    await pool.query('CALL RespondToBooking(?, ?, ?, ?, ?)', [booking_id, user_id, role, acceptance_status, comments || null]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get booking details with items and status
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ? LIMIT 1', [id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const [items] = await pool.query('SELECT bmi.*, mi.name FROM booking_menu_items bmi LEFT JOIN menu_items mi ON bmi.menu_item_id = mi.menu_item_id WHERE bmi.booking_id = ?', [id]);
    const [chefStatus] = await pool.query('SELECT coa.*, u.name FROM chef_order_acceptance coa JOIN Users u ON coa.chef_user_id = u.user_id WHERE coa.booking_id = ?', [id]);
    const [vendorStatus] = await pool.query('SELECT voa.*, u.name FROM vendor_order_acceptance voa JOIN Users u ON vendor_user_id = u.user_id WHERE voa.booking_id = ?', [id]);
    const [[order]] = await pool.query('SELECT * FROM orders WHERE booking_id = ? LIMIT 1', [id]);

    res.json({ 
      booking: booking, 
      menu_items: items || [],
      chef_status: chefStatus || [],
      vendor_status: vendorStatus || [],
      order: order || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /partner/:userId -> Get assignments (pending/accepted) for a chef or vendor
router.get('/partner/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  const role = req.query.role; // 'chef' or 'vendor'
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });

  try {
    let sql = '';
    if (role === 'chef') {
      sql = `SELECT b.*, coa.acceptance_status FROM bookings b JOIN chef_order_acceptance coa ON b.booking_id = coa.booking_id WHERE coa.chef_user_id = ? ORDER BY b.event_date ASC`;
    } else if (role === 'vendor') {
      sql = `SELECT b.*, voa.acceptance_status FROM bookings b JOIN vendor_order_acceptance voa ON b.booking_id = voa.booking_id WHERE voa.vendor_user_id = ? ORDER BY b.event_date ASC`;
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [results] = await pool.query(sql, [userId]);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
