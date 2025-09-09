const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callProcedureWithOut } = require('../lib/sp-helper');

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
    res.json({ success: true, booking_id: out ? out.booking_id : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add menu item to booking -> AddMenuItemToBooking
router.post('/:bookingId/menu-items', async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { menu_item_id, quantity, price } = req.body;
  if (!bookingId || !menu_item_id || quantity == null || price == null) return res.status(400).json({ error: 'bookingId, menu_item_id, quantity, price required' });
  try {
    await pool.query('CALL AddMenuItemToBooking(?, ?, ?, ?)', [bookingId, menu_item_id, quantity, price]);
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

// Get booking details with items
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ? LIMIT 1', [id]);
    const [items] = await pool.query('SELECT bmi.*, mi.name FROM booking_menu_items bmi LEFT JOIN menuitems mi ON bmi.menu_item_id = mi.menu_item_id WHERE bmi.booking_id = ?', [id]);
    res.json({ booking: booking || null, menu_items: items || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
