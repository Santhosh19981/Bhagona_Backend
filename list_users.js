const pool = require('./src/db');
require('dotenv').config();

async function listUsers() {
    try {
        const [rows] = await pool.query('SELECT user_id, full_name, email FROM Users LIMIT 20');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        // If Users fails, try users
        try {
            const [rows] = await pool.query('SELECT user_id, full_name, email FROM users LIMIT 20');
            console.log(JSON.stringify(rows, null, 2));
        } catch (err2) {
            console.error('Error users:', err2.message);
        }
    } finally {
        process.exit();
    }
}

listUsers();
