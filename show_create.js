const pool = require('./src/db');
require('dotenv').config();

async function showCreate() {
    try {
        console.log('--- CREATE TABLE Users ---');
        const [u] = await pool.query('SHOW CREATE TABLE Users');
        console.log(u[0]['Create Table']);
        
        console.log('\n--- CREATE TABLE bookings ---');
        const [b] = await pool.query('SHOW CREATE TABLE bookings');
        console.log(b[0]['Create Table']);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
showCreate();
