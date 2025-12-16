const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise

// GET /payments/history?type=Credit|Debit
// Returns payment history, optionally filtered by transaction_type
router.get('/history', async (req, res) => {
  try {
    const { type, q } = req.query;

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
      LEFT JOIN Users u ON ph.user_id = u.id
    `;

    const params = [];

    if (type && (type === 'Credit' || type === 'Debit')) {
      sql += ' WHERE ph.transaction_type = ?';
      params.push(type);
    }

    // simple search across user name, description or payment_id
    if (q && q.trim() !== '') {
      const search = `%${q.trim()}%`;
      if (params.length === 0) {
        sql += ' WHERE ';
      } else {
        sql += ' AND ';
      }
      sql += '(u.name LIKE ? OR ph.description LIKE ? OR ph.payment_id LIKE ?)';
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
