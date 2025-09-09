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

module.exports = router;
