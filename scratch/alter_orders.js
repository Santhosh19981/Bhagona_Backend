const mysql = require("mysql2/promise");
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bhagona_db'
    });

    try {
        console.log("Altering orders.payment_status to VARCHAR(50)...");
        await connection.query("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'pending'");
        console.log("Success! Checking schema again:");
        const [ordersCol] = await connection.query("SHOW COLUMNS FROM orders");
        console.table(ordersCol);
    } catch (err) {
        console.error("Error altering table:", err);
    } finally {
        await connection.end();
    }
}

run();
