const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all active chefs
router.get('/active', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetAllActiveChefs()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add chef availability
router.post('/availability', async (req, res) => {
  const { chef_user_id, date, start_time, end_time } = req.body;
  if (!chef_user_id || !date || !start_time || !end_time) return res.status(400).json({ error: 'chef_user_id, date, start_time, end_time required' });
  try {
    await pool.query('CALL AddChefAvailability(?, ?, ?, ?)', [chef_user_id, date, start_time, end_time]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get chef availability range
router.get('/:chefId/availability', async (req, res) => {
  const chefId = Number(req.params.chefId);
  const { from, to } = req.query;
  if (!chefId || !from || !to) return res.status(400).json({ error: 'chefId, from, to required (YYYY-MM-DD)' });
  try {
    const [rows] = await pool.query('CALL GetChefAvailability(?, ?, ?)', [chefId, from, to]);
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
