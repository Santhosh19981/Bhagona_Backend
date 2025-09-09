const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callProcedureWithOut } = require('../lib/sp-helper');

// Add user -> calls AddUser(..., OUT p_user_id)
router.post('/', async (req, res) => {
  const { role_name, full_name, email, password_hash, phone, address } = req.body;
  if (!role_name || !full_name || !email || !password_hash) return res.status(400).json({ error: 'role_name, full_name, email, password_hash required' });
  try {
    const sql = "CALL AddUser(?, ?, ?, ?, ?, ?, @new_user_id); SELECT @new_user_id as user_id;";
    const results = await callProcedureWithOut(sql, [role_name, full_name, email, password_hash, phone || null, address || null], 'user_id');
    // results includes array of result sets; last one contains the SELECT
    const out = Array.isArray(results) ? results[1] && results[1][0] : null;
    res.json({ success: true, user_id: out ? out.user_id : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update user -> UpdateUser p_user_id,...
router.put('/:id', async (req, res) => {
  const userId = Number(req.params.id);
  const { full_name, phone, address, status } = req.body;
  if (!userId) return res.status(400).json({ error: 'user id required' });
  try {
    await pool.query('CALL UpdateUser(?, ?, ?, ?, ?)', [userId, full_name || null, phone || null, address || null, status || null]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get active users -> GetAllUsers()
router.get('/active', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetAllUsers()');
    // stored proc returns results inside an array (rows[0])
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
