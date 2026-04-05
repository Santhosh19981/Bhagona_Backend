const pool = require('./src/db');
require('dotenv').config();

async function inspect() {
    try {
        console.log('--- TABLE CONSTRAINTS ---');
        const [constraints] = await pool.query(`
            SELECT 
                CONSTRAINT_NAME, 
                TABLE_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'u385969042_test_db' 
              AND (TABLE_NAME = 'bookings' OR TABLE_NAME = 'Users')
        `);
        console.log(JSON.stringify(constraints, null, 2));

        console.log('--- COLUMN TYPES ---');
        const [cols] = await pool.query(`
            SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'u385969042_test_db' 
              AND (TABLE_NAME = 'bookings' OR TABLE_NAME = 'Users')
        `);
        console.log(JSON.stringify(cols, null, 2));

        console.log('--- TABLE STATUS ---');
        const [tables] = await pool.query(`
            SELECT TABLE_NAME, ENGINE, TABLE_COLLATION 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'u385969042_test_db' 
              AND (TABLE_NAME = 'bookings' OR TABLE_NAME = 'Users')
        `);
        console.log(JSON.stringify(tables, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
inspect();
