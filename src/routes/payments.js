const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise

// GET /payments/history?type=Credit|Debit
// Returns payment history, optionally filtered by transaction_type
router.get('/history', async (req, res) => {
  try {
    const { type, q, userId } = req.query;

    // Base query - join with Users to fetch user name (optional)
    let sql = `
      SELECT 
        ph.payment_id AS id,
        ph.user_id,
        u.name AS userName,
        ph.amount,
        ph.transaction_type AS type,
        ph.transaction_date AS date,
        ph.description
      FROM payment_history ph
      LEFT JOIN Users u ON ph.user_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      sql += ' AND ph.user_id = ?';
      params.push(userId);
    }

    if (type && (type.toLowerCase() === 'credit' || type.toLowerCase() === 'debit')) {
      sql += ' AND ph.transaction_type = ?';
      params.push(type.toLowerCase());
    }

    // simple search across user name, description or payment_id
    if (q && q.trim() !== '') {
      const search = `%${q.trim()}%`;
      sql += ' AND (u.name LIKE ? OR ph.description LIKE ? OR ph.payment_id LIKE ?)';
      params.push(search, search, search);
    }

    sql += ' ORDER BY ph.transaction_date DESC';

    const [rows] = await db.query(sql, params);

    return res.json({ status: true, data: rows });
  } catch (err) {
    console.error('DB Error (payments/history):', err);
    return res.status(500).json({ status: false, message: 'Database error' });
  }
});

module.exports = router;
