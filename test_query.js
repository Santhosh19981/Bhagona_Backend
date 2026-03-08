const mysql = require("mysql2/promise");

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: '82.25.121.30',
            port: 3306,
            user: 'u385969042_test_user',
            password: 'Bhagonatest@1998',
            database: 'u385969042_test_db',
        });

        console.log('Connected');

        const service_id = '3';
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
        const params = [service_id, service_id, service_id, service_id, service_id, service_id];

        const [rows] = await connection.query(sql, params);
        console.log('Query Result for service_id 3:', JSON.stringify(rows, null, 2));

        const [allVendors] = await connection.query('SELECT id, name, role, isactive, isapproved, services FROM Users WHERE role = 3');
        console.log('All Vendors (role 3):', JSON.stringify(allVendors, null, 2));

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

run();
