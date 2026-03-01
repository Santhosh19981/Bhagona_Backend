const pool = require('./src/db');
require('dotenv').config();

async function checkSchema() {
    try {
        console.log('--- Checking vendor_service_mappings entries ---');
        const [mappings] = await pool.query('SELECT * FROM vendor_service_mappings');
        console.log('Mappings:', mappings);

        console.log('\n--- Checking User 25 ---');
        const [user] = await pool.query('SELECT id, name, services FROM users WHERE id = 25');
        console.log('User 25:', user);

        console.log('\n--- Checking Services Table ---');
        const [services] = await pool.query('SELECT service_id, name FROM services');
        console.log('Services:', services);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkSchema();
