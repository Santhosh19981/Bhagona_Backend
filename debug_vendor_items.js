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

        const [rows] = await connection.query("SELECT * FROM vendor_item_mappings WHERE vendor_id = 25");
        fs.writeFileSync('vendor_items_check.json', JSON.stringify(rows, null, 2));

        const [allItems] = await connection.query("SELECT * FROM service_items WHERE service_id = 3");
        fs.writeFileSync('service_items_id3.json', JSON.stringify(allItems, null, 2));

        await connection.end();
    } catch (err) {
        fs.writeFileSync('vendor_items_check_error.txt', err.toString());
    } finally {
        process.exit(0);
    }
}

run();
