const pool = require('./src/db');
require('dotenv').config();

async function checkCols() {
    try {
        const [rows] = await pool.query('DESCRIBE Users');
        console.log('Users Columns:');
        rows.forEach(r => console.log(`- ${r.Field}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
checkCols();
