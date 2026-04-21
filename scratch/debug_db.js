const db = require('../src/db');
async function debug() {
    try {
        const [createTable] = await db.query('SHOW CREATE TABLE vendor_bank_accounts');
        console.log('--- CREATE TABLE ---');
        console.log(createTable[0]['Create Table']);

        const [user] = await db.query('SELECT * FROM Users WHERE user_id = 25');
        console.log('\n--- USER 25 ---');
        console.log(JSON.stringify(user, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
debug();
