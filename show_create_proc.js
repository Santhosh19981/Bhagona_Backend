const pool = require('./src/db');
require('dotenv').config();

async function showProc() {
    try {
        const [rows] = await pool.query("SHOW CREATE PROCEDURE CreateBooking");
        console.log(rows[0]['Create Procedure']);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
showProc();
