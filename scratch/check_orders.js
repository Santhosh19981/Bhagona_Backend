const mysql = require("mysql2/promise");
require('dotenv').config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bhagona_db'
    });

    try {
        console.log("Checking last 5 orders:");
        const [orders] = await connection.query("SELECT booking_id, order_id, order_value, payment_status, razorpay_order_id, razorpay_payment_id, payment_date FROM orders ORDER BY order_id DESC LIMIT 5");
        console.table(orders);

        console.log("Checking last 5 bookings:");
        const [bookings] = await connection.query("SELECT booking_id, customer_id, event_date, status, total_amount FROM bookings ORDER BY booking_id DESC LIMIT 5");
        console.table(bookings);
    } catch (err) {
        console.error("Database query error:", err);
    } finally {
        await connection.end();
    }
}

check();
