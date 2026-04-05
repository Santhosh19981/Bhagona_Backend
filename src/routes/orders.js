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
        b.total_members AS members,
        b.status AS booking_status,
        b.event_date
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      ORDER BY o.created_at DESC
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
      ORDER BY o.created_at DESC
    `, [status]);
    res.json({ data: rows || [] });
  } catch (err) {
    console.error(`Error fetching orders with status ${status}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Orders for a specific customer
router.get('/customer/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.order_id AS id,
        o.booking_id,
        o.order_value AS amount,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.payment_date,
        o.created_at,
        o.updated_at,
        b.status AS status,
        b.booking_type,
        b.event_date AS date,
        b.total_members AS members,
        u.name AS customer_name,
        u.email AS customer_email,
        u.mobile AS customer_mobile,
        u.address AS customer_address
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      JOIN Users u ON b.customer_user_id = u.user_id
      WHERE b.customer_user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    // Map to the structure expected by the frontend
    const formattedData = rows.map(order => ({
      ...order,
      orderType: (order.booking_type === 'chef_booking' || order.booking_type === 'full_event_booking') ? 'event' : 'service',
      customerDetails: {
        name: order.customer_name,
        email: order.customer_email,
        mobile: order.customer_mobile,
        address: order.customer_address
      },
      data: [] // Placeholder for items if needed
    }));

    res.json({ data: formattedData });
  } catch (err) {
    console.error(`Error fetching orders for customer ${userId}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH: Update order status (payment and/or booking)
router.patch('/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { payment_status, booking_status } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    if (payment_status) {
      await connection.query('UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE order_id = ?', [payment_status, orderId]);
    }
    
    if (booking_status) {
      const [[order]] = await connection.query('SELECT booking_id FROM orders WHERE order_id = ?', [orderId]);
      if (order) {
        await connection.query('UPDATE bookings SET status = ?, updated_at = NOW() WHERE booking_id = ?', [booking_status, order.booking_id]);
      }
    }
    
    await connection.commit();
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(`Error updating status for order ${orderId}:`, err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// GET: Cancelled orders filtered by role
router.get('/cancelled/:role', async (req, res) => {
  const role = req.params.role; 
  try {
    const [rows] = await pool.query(`CALL GetOrdersCancelledByRole(?)`, [role]);
    res.json({ data: rows[0] || [] });
  } catch (err) {
    console.error(`Error fetching cancelled orders for role ${role}:`, err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
