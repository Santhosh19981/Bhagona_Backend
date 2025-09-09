const express = require('express');
const router = express.Router();
const pool = require('../db');

// List all menu items
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menuitems ORDER BY menu_item_id');
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List veg items or non-veg (simple filter by name/description containing keyword 'veg' or 'nonveg')
router.get('/filter', async (req, res) => {
  const { type } = req.query; // 'veg' or 'nonveg'
  try {
    let q = 'SELECT * FROM menuitems';
    const params = [];
    if (type === 'veg') {
      q += " WHERE LOWER(name) LIKE '%veg%' OR LOWER(description) LIKE '%veg%'";
    } else if (type === 'nonveg' || type === 'non-veg') {
      q += " WHERE LOWER(name) LIKE '%non' OR LOWER(name) LIKE '%chicken%' OR LOWER(name) LIKE '%mutton%'";
    }
    const [rows] = await pool.query(q, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
