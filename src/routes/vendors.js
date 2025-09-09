const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/active', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetAllActiveVendors()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/catering', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetCateringVendors()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
