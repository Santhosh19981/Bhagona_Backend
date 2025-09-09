const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/status-summary', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetOrdersStatusSummary()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/cancelled/:role', async (req, res) => {
  const role = req.params.role;
  try {
    const [rows] = await pool.query('CALL GetOrdersCancelledByRole(?)', [role]);
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
