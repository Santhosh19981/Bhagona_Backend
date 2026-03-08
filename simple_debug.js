const mysql = require('mysql2/promise');
const fs = require('fs');

console.log('Script started');
try {
    const env = fs.readFileSync('.env', 'utf8');
    console.log('Env file read');
    // Simple regex for env
    const host = env.match(/DB_HOST=(.*)/)[1].trim();
    const user = env.match(/DB_USER=(.*)/)[1].trim();
    const password = env.match(/DB_PASSWORD=(.*)/)[1].trim();
    const database = env.match(/DB_NAME=(.*)/)[1].trim();
    const port = env.match(/DB_PORT=(.*)/)[1].trim();

    console.log('Connecting to:', host, database);

    async function test() {
        const connection = await mysql.createConnection({
            host, user, password, database, port: Number(port)
        });
        console.log('Connected');
        const [rows] = await connection.query('SELECT id, name, services FROM Users WHERE id = 25');
        console.log('Vijay:', JSON.stringify(rows));
        await connection.end();
    }

    test().catch(err => console.error('Test error:', err));
} catch (e) {
    console.error('Initial error:', e);
}
