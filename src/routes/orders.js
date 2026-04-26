const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET: All orders with members count
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;

    let sql = `
      SELECT DISTINCT
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
    `;

    const params = [];

    if (role == 3) { // Vendor
      sql += `
        LEFT JOIN vendor_bookings vb ON b.booking_id = vb.booking_id
        LEFT JOIN vendor_order_acceptance voa ON b.booking_id = voa.booking_id
        WHERE (vb.primary_vendor_user_id = ? 
           OR vb.alternate_vendor1_user_id = ? 
           OR vb.alternate_vendor2_user_id = ?
           OR voa.vendor_user_id = ?)
      `;
      params.push(userId, userId, userId, userId);
    } else if (role == 2) { // Chef
      sql += `
        LEFT JOIN chef_bookings cb ON b.booking_id = cb.booking_id
        LEFT JOIN chef_order_acceptance coa ON b.booking_id = coa.booking_id
        WHERE (cb.primary_chef_user_id = ? 
           OR cb.alternate_chef1_user_id = ? 
           OR cb.alternate_chef2_user_id = ?
           OR coa.chef_user_id = ?)
      `;
      params.push(userId, userId, userId, userId);
    } else if (role == 1) { // Customer
      sql += ` WHERE b.customer_user_id = ? `;
      params.push(userId);
    }

    sql += ` ORDER BY o.created_at DESC `;

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows || [] });
  } catch (err) {
    console.error('Error fetching filtered orders:', err);
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
        u.address AS customer_address,
        r.hygiene_rating AS hygiene,
        r.food_taste_rating AS taste,
        r.chef_behavior_rating AS behavior,
        r.comments AS rating_comment
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      JOIN Users u ON b.customer_user_id = u.user_id
      LEFT JOIN reviews r ON b.booking_id = r.booking_id
      WHERE b.customer_user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    // Map to the structure expected by the frontend
    const formattedData = rows.map(order => ({
      ...order,
      orderType: (order.booking_type === 'chef_booking' || order.booking_type === 'full_event_booking') ? 'event' : 'service',
      rating: order.hygiene ? {
        hygiene: order.hygiene,
        taste: order.taste,
        behavior: order.behavior,
        comment: order.rating_comment
      } : null,
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
        console.log('UPDATING BOOKING STATUS:', { booking_id: order.booking_id, new_status: booking_status });
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


// GET: Pending payouts for admin
router.get('/payouts/pending', async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.order_id,
        o.booking_id,
        o.order_value,
        o.admin_commission,
        o.vendor_payout_amount,
        o.payment_date,
        b.booking_type,
        b.event_date,
        u.name AS vendor_name,
        vba.bank_name,
        vba.account_number,
        vba.ifsc_code,
        vba.account_holder_name
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      -- Join to find the vendor (chef or service vendor)
      LEFT JOIN (
          SELECT booking_id, primary_chef_user_id AS vendor_user_id FROM chef_bookings
          UNION
          SELECT booking_id, primary_vendor_user_id AS vendor_user_id FROM vendor_bookings
      ) v_map ON b.booking_id = v_map.booking_id
      LEFT JOIN Users u ON v_map.vendor_user_id = u.user_id
      LEFT JOIN vendor_bank_accounts vba ON v_map.vendor_user_id = vba.vendor_user_id AND vba.is_default = TRUE
      WHERE o.payment_status = 'Paid' AND o.payout_status = 'Pending'
      ORDER BY o.payment_date ASC
    `;
    const [rows] = await pool.query(sql);
    res.json({ status: true, data: rows || [] });
  } catch (err) {
    console.error('Error fetching pending payouts:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// POST: Confirm payout
router.post('/payouts/confirm/:id', async (req, res) => {
  const orderId = req.params.id;
  const { transaction_id, notes } = req.body;
  try {
    await pool.query(
      'UPDATE orders SET payout_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['Completed', orderId]
    );
    // Optionally log this in a payout_history table if needed later
    res.json({ status: true, message: 'Payout confirmed successfully' });
  } catch (err) {
    console.error('Error confirming payout:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = router;

