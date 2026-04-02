const pool = require('./src/db');
require('dotenv').config();

async function checkConstraint() {
    try {
        const sql = `
            SELECT 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM 
                information_schema.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_NAME = 'bookings' 
                AND TABLE_SCHEMA = 'u385969042_test_db' 
                AND (CONSTRAINT_NAME = 'bookings_ibfk_1' OR COLUMN_NAME = 'customer_user_id')
        `;
        const [rows] = await pool.query(sql);
        console.log(JSON.stringify(rows, null, 2));

        const [usersCols] = await pool.query('DESCRIBE Users');
        console.log('Users columns:', JSON.stringify(usersCols, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkConstraint();
