const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET: All orders with members count
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.order_id,
        o.booking_id,
        o.order_value,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.payment_date,
        o.created_at,
        o.updated_at,
        b.total_members AS members
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
    `);
    res.json({ data: rows || [] });
  } catch (err) {
    console.error('Error fetching all orders with members:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Orders status summary with members
router.get('/status-summary', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.payment_status,
        COUNT(*) AS total_orders,
        SUM(b.total_members) AS total_members
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      GROUP BY o.payment_status
    `);
    res.json({ data: rows || [] });
  } catch (err) {
    console.error('Error fetching status summary with members:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Orders by booking status with members
router.get('/by-status/:status', async (req, res) => {
  const status = req.params.status; // upcoming, processing, completed, cancelled
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.order_id,
        o.booking_id,
        o.order_value,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.payment_date,
        o.created_at,
        o.updated_at,
        b.total_members AS members
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      WHERE o.payment_status = ?
    `, [status]);
    res.json({ data: rows || [] });
  } catch (err) {
    console.error(`Error fetching orders with status ${status}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Cancelled orders filtered by role with members
// GET: Cancelled orders filtered by role with members
router.get('/cancelled/:role', async (req, res) => {
  const role = req.params.role; // e.g., 'customer', 'chef', 'vendor'
  try {
    const [rows] = await pool.query(`CALL GetOrdersCancelledByRole(?)`, [role]);
    res.json({ data: rows[0] || [] }); // rows[0] contains result set
  } catch (err) {
    console.error(`Error fetching cancelled orders for role ${role}:`, err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
