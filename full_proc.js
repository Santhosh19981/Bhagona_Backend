const pool = require('./src/db');
require('dotenv').config();

async function fullProc() {
    try {
        const [rows] = await pool.query("SHOW CREATE PROCEDURE CreateBooking");
        const procSql = rows[0]['Create Procedure'];
        console.log('--- FULL PROCEDURE SOURCE ---');
        console.log(procSql);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
fullProc();
