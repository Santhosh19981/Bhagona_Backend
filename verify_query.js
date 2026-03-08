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

        const service_id = '3';
        const params = [service_id, service_id, service_id, service_id, service_id, service_id];
        const sql = `
                SELECT u.id, u.name, u.role, u.isactive, u.isapproved, u.services
                FROM Users u
                LEFT JOIN vendor_service_mappings vsm ON u.id = vsm.vendor_id
                WHERE u.role = 3 AND u.isactive = 1 AND u.isapproved = 1 
                  AND (
                    vsm.service_id = ? 
                    OR FIND_IN_SET(?, REPLACE(u.services, ' ', ''))
                    OR u.services = ?
                    OR u.services LIKE CONCAT('%,', ?, ',%')
                    OR u.services LIKE CONCAT(?, ',%')
                    OR u.services LIKE CONCAT('%,', ?)
                  )
                GROUP BY u.id
            `;

        const [rows] = await connection.query(sql, params);
        console.log('Result count:', rows.length);
        fs.writeFileSync('verify_result.json', JSON.stringify(rows, null, 2));

        await connection.end();
    } catch (err) {
        fs.writeFileSync('verify_error.txt', err.toString());
    } finally {
        process.exit(0);
    }
}

run();
