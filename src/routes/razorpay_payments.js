const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
    key_id: (process.env.RAZORPAY_KEY_ID || 'rzp_test_SgBxmI3d2kzrUL').trim(),
    key_secret: (process.env.RAZORPAY_KEY_SECRET || 'C18RjQDbYsbfK0M86AJv3d4b').trim()
});

// POST /razorpay/create-order - Create a new Razorpay order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, booking_id, customer_id } = req.body;

        if (!amount || !booking_id) {
            return res.status(400).json({ status: false, message: 'Amount and booking ID are required' });
        }

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `order_rcpt_${booking_id}_${Date.now()}`,
            notes: {
                booking_id: booking_id,
                customer_id: customer_id
            }
        };

        const order = await razorpay.orders.create(options);

        // Update the order table with the razorpay_order_id
        await db.query(
            'UPDATE orders SET razorpay_order_id = ?, payment_status = ? WHERE booking_id = ?',
            [order.id, 'Created', booking_id]
        );

        res.json({
            status: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (err) {
        console.error('RAZORPAY ERROR:', err);
        res.status(500).json({ 
            status: false, 
            message: 'Razorpay Error', 
            details: err.message,
            error_code: err.code || 'UNKNOWN'
        });
    }
});

// POST /razorpay/verify-payment - Verify Razorpay payment signature
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

        const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
        const body = razorpay_order_id + '|' + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment is valid
            const commissionRate = 0.10; // 10% platform fee
            
            // Get order details to calculate split
            const [orderRows] = await db.query('SELECT order_value FROM orders WHERE booking_id = ?', [booking_id]);
            const orderValue = orderRows[0]?.order_value || 0;
            const adminCommission = orderValue * commissionRate;
            const vendorAmount = orderValue - adminCommission;

            // Update order status and details
            await db.query(`
                UPDATE orders 
                SET payment_status = 'Paid',
                    razorpay_payment_id = ?,
                    razorpay_signature = ?,
                    payment_date = NOW(),
                    admin_commission = ?,
                    vendor_payout_amount = ?,
                    payout_status = 'Pending'
                WHERE booking_id = ?`,
                [razorpay_payment_id, razorpay_signature, adminCommission, vendorAmount, booking_id]
            );

            // Also update booking status
            await db.query('UPDATE bookings SET status = ? WHERE booking_id = ?', ['confirmed', booking_id]);

            res.json({ status: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ status: false, message: 'Invalid signature' });
        }
    } catch (err) {
        console.error('Error verifying payment:', err);
        res.status(500).json({ status: false, message: 'Verification error' });
    }
});

module.exports = router;
