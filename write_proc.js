const pool = require('./src/db');
const fs = require('fs');
require('dotenv').config();

async function writeProc() {
    try {
        const [rows] = await pool.query("SHOW CREATE PROCEDURE CreateBooking");
        const procSql = rows[0]['Create Procedure'];
        fs.writeFileSync('CreateBooking_Source.sql', procSql);
        console.log('✅ Procedure source written to CreateBooking_Source.sql');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
writeProc();
