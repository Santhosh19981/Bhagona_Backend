const db = require('../src/db');

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE orders');
        console.log('ORDERS TABLE COLUMNS:', rows.map(r => r.Field));
    } catch (err) {
        console.error('SCHEMA ERROR:', err);
    }
}

checkSchema();
