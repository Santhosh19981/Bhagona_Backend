const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetAllServices()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/with-unit', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetServicesWithUnit()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
