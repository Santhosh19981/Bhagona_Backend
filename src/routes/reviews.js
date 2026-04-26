const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const { booking_id, customer_user_id, hygiene, food_taste, chef_behavior, comments } = req.body;
  if (!booking_id || !customer_user_id) return res.status(400).json({ error: 'booking_id and customer_user_id required' });
  try {
    await pool.query('CALL AddReview(?, ?, ?, ?, ?, ?)', [booking_id, customer_user_id, hygiene || 0, food_taste || 0, chef_behavior || 0, comments || null]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get reviews for a specific vendor
router.get('/vendor/:vendor_id', async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        r.*, 
        u.name as customer_name,
        (r.hygiene_rating + r.food_taste_rating + r.chef_behavior_rating) / 3 as rating
      FROM reviews r
      JOIN Users u ON r.customer_user_id = u.user_id
      JOIN bookings b ON r.booking_id = b.booking_id
      LEFT JOIN chef_bookings cb ON b.booking_id = cb.booking_id
      LEFT JOIN vendor_bookings vb ON b.booking_id = vb.booking_id
      WHERE cb.primary_chef_user_id = ? OR vb.primary_vendor_user_id = ?
      ORDER BY r.created_at DESC
    `, [vendor_id, vendor_id]);

    res.json({ status: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: 'Database error' });
  }
});

module.exports = router;
