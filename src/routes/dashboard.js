const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    // 1. Total Revenue (sum of order_value for Paid orders)
    const [revenueRes] = await db.query("SELECT SUM(order_value) as totalRevenue FROM orders WHERE payment_status = 'Paid'");
    
    // 2. Total Orders
    const [ordersRes] = await db.query("SELECT COUNT(*) as totalOrders FROM orders");
    
    // 3. Registered Chefs (role 2)
    const [chefsRes] = await db.query("SELECT COUNT(*) as totalChefs FROM Users WHERE role = 2 AND isapproved = 1");
    
    // 4. Pending Approvals (role 2 or 3 and isapproved = 0)
    const [approvalsRes] = await db.query("SELECT COUNT(*) as totalPending FROM Users WHERE (role = 2 OR role = 3) AND isapproved = 0");

    // 5. Recent Orders (last 5)
    const [recentOrdersRes] = await db.query(`
      SELECT 
        o.order_id AS id,
        u.name AS customer,
        b.booking_type AS item,
        o.order_value AS amount,
        b.status AS status,
        o.created_at AS date
      FROM orders o
      JOIN bookings b ON o.booking_id = b.booking_id
      JOIN Users u ON b.customer_user_id = u.user_id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      status: true,
      data: {
        stats: {
          totalRevenue: revenueRes[0].totalRevenue || 0,
          totalOrders: ordersRes[0].totalOrders || 0,
          registeredChefs: chefsRes[0].totalChefs || 0,
          pendingApprovals: approvalsRes[0].totalPending || 0
        },
        recentOrders: recentOrdersRes
      }
    });
  } catch (err) {
    console.error('Dashboard Stats Error:', err);
    res.status(500).json({ status: false, message: 'Database error' });
  }
});

module.exports = router;
