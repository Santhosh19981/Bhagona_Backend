const pool = require('./src/db');
require('dotenv').config();

async function fullDescribe() {
    try {
        const [rows] = await pool.query('DESCRIBE Users');
        console.log('Columns of Users:');
        rows.forEach(r => console.log(`- ${r.Field} (${r.Type})`));
        
        const [rows2] = await pool.query('SELECT * FROM Users LIMIT 1');
        console.log('First user row:', JSON.stringify(rows2[0], null, 2));

        const [rows3] = await pool.query("SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'bookings' AND TABLE_SCHEMA = 'u385969042_test_db'");
        console.log('Bookings constraints:', JSON.stringify(rows3, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

fullDescribe();
