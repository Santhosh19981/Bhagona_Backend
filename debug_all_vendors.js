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

        const [rows] = await connection.query("SELECT id, name, services, isactive, isapproved, role FROM Users WHERE role = 3");
        console.log('All Vendors count:', rows.length);
        fs.writeFileSync('all_vendors_debug.json', JSON.stringify(rows, null, 2));

        await connection.end();
    } catch (err) {
        fs.writeFileSync('all_vendors_error.txt', err.toString());
    } finally {
        process.exit(0);
    }
}

run();
