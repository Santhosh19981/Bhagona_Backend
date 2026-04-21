const db = require('../src/db');
async function checkTable() {
    try {
        const [rows] = await db.query('DESCRIBE vendor_bank_accounts');
        console.log('Table Structure:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error checking table:', err.message);
        process.exit(1);
    }
}
checkTable();
