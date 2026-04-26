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
      const { customer_name, customer_email, customer_mobile, customer_address, payment_method } = body;
      
      const pMethod = payment_method || 'Online';
      const pStatus = pMethod === 'COD' ? 'Pending (At Venue)' : 'Awaiting Payment';

      await pool.query(
        `INSERT INTO orders (
          order_id, booking_id, customer_name, customer_email, customer_mobile, customer_address, 
          order_value, payment_status, payment_method, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId, bookingId, 
          customer_name || null, 
          customer_email || null, 
          customer_mobile || null, 
          customer_address || null, 
          0, pStatus, pMethod
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

// Add menu item to booking
router.post('/:bookingId/menu-items', async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { menu_item_id, service_item_id, quantity, price, item_name } = req.body;
  if (!bookingId || quantity == null || price == null) return res.status(400).json({ error: 'bookingId, quantity, price required' });
  try {
    // If it's a service item, we skip the SP to avoid food-menu FK constraint checks
    if (service_item_id) {
       await pool.query(
        'INSERT INTO booking_menu_items (booking_id, service_item_id, quantity, price) VALUES (?, ?, ?, ?)',
        [bookingId, service_item_id, quantity, price]
      );
    } else {
      // Try stored procedure first for menu items, fallback to direct insert
      try {
        await pool.query('CALL AddMenuItemToBooking(?, ?, ?, ?)', [bookingId, menu_item_id || null, quantity, price]);
      } catch (spErr) {
        await pool.query(
          'INSERT INTO booking_menu_items (booking_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
          [bookingId, menu_item_id || null, quantity, price]
        );
      }
    }

    // If item_name provided, store it in the latest inserted row
    if (item_name) {
      await pool.query(
        `UPDATE booking_menu_items SET item_name = ? WHERE booking_id = ? AND (menu_item_id <=> ? OR service_item_id <=> ?) ORDER BY id DESC LIMIT 1`,
        [item_name, bookingId, menu_item_id || null, service_item_id || null]
      );
    }

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
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });

  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ? LIMIT 1', [id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Fetch ordered items
    const [items] = await pool.query(`
      SELECT bmi.*, 
        COALESCE(bmi.item_name, mi.name, si.name, 'Service Item') AS item_name
      FROM booking_menu_items bmi 
      LEFT JOIN menu_items mi ON bmi.menu_item_id = mi.menu_item_id
      LEFT JOIN service_items si ON bmi.service_item_id = si.service_item_id
      WHERE bmi.booking_id = ?
    `, [id]);

    // Fetch assignment status
    const [chefStatus] = await pool.query('SELECT coa.*, u.name FROM chef_order_acceptance coa JOIN Users u ON coa.chef_user_id = u.user_id WHERE coa.booking_id = ?', [id]);
    const [vendorStatus] = await pool.query('SELECT voa.*, u.name FROM vendor_order_acceptance voa JOIN Users u ON voa.vendor_user_id = u.user_id WHERE voa.booking_id = ?', [id]);
    
    // Fetch Primary Providers from normalized tables
    let primaryChef = null;
    let primaryVendor = null;

    const [[chefInfo]] = await pool.query('SELECT primary_chef_user_id FROM chef_bookings WHERE booking_id = ?', [id]);
    if (chefInfo && chefInfo.primary_chef_user_id) {
      [[primaryChef]] = await pool.query('SELECT user_id, name, mobile, email, image, businessname, rating FROM Users WHERE user_id = ?', [chefInfo.primary_chef_user_id]);
    }

    const [[vendorInfo]] = await pool.query('SELECT primary_vendor_user_id FROM vendor_bookings WHERE booking_id = ?', [id]);
    if (vendorInfo && vendorInfo.primary_vendor_user_id) {
      [[primaryVendor]] = await pool.query('SELECT user_id, name, mobile, email, image, businessname, rating FROM Users WHERE user_id = ?', [vendorInfo.primary_vendor_user_id]);
    }

    const [[order]] = await pool.query('SELECT * FROM orders WHERE booking_id = ? LIMIT 1', [id]);

    res.json({ 
      booking: booking, 
      menu_items: items || [],
      chef_status: chefStatus || [],
      vendor_status: vendorStatus || [],
      primary_chef: primaryChef || null,
      primary_vendor: primaryVendor || null,
      order: order || null
    });
  } catch (err) {
    console.error('API Error /bookings/:id:', err);
    // On error, we still try to return a valid JSON so the frontend doesn't see a "CORS error"
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
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
