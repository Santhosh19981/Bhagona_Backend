const pool = require('./src/db');
require('dotenv').config();

async function dumpFKs() {
    try {
        console.log('--- ALL FOREIGN KEYS IN SCHEMA ---');
        const [rows] = await pool.query(`
            SELECT 
                TABLE_NAME, 
                CONSTRAINT_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'u385969042_test_db' 
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
dumpFKs();
