const mysql = require("mysql2/promise");
const fs = require("fs");

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: '82.25.121.30',
            port: 3306,
            user: 'u385969042_test_user',
            password: 'Bhagonatest@1998',
            database: 'u385969042_test_db',
        });

        const [rows] = await connection.query("SELECT id, name, services, HEX(services) as hex_services FROM Users WHERE id = 25");
        console.log('ID 25 HEX:', JSON.stringify(rows, null, 2));
        fs.writeFileSync('debug_hex.json', JSON.stringify(rows, null, 2));

        await connection.end();
    } catch (err) {
        fs.writeFileSync('debug_hex_error.txt', err.toString());
    } finally {
        process.exit(0);
    }
}

run();
