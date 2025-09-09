const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const { user_id, amount, transaction_type, booking_id, description } = req.body;
  if (!user_id || amount == null) return res.status(400).json({ error: 'user_id and amount required' });
  try {
    const [result] = await pool.query('INSERT INTO payments_history (user_id, amount, transaction_type, transaction_date, description, booking_id, created_at) VALUES (?, ?, ?, NOW(), ?, ?, NOW())', [user_id, amount, transaction_type || 'credit', description || null, booking_id || null]);
    res.json({ success: true, payment_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
