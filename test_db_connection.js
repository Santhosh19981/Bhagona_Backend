const db = require('./src/db');

async function test() {
    try {
        const [rows] = await db.query('SELECT 1 as result');
        console.log('✅ DB Connection Successful:', rows);
        process.exit(0);
    } catch (err) {
        console.error('❌ DB Connection Failed:', err);
        process.exit(1);
    }
}

test();
