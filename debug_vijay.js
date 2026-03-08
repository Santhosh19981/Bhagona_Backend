const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '.env');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: env.DB_HOST,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
            port: Number(env.DB_PORT) || 3306
        });

        console.log('--- Checking Vendor Vijay (ID 25) ---');
        const [vijay] = await connection.query('SELECT id, name, role, isactive, isapproved, services FROM Users WHERE id = 25');
        console.log('Vijay Row:', JSON.stringify(vijay, null, 2));

        if (vijay.length > 0) {
            const services = vijay[0].services;
            console.log(`Services value: "${services}" (Length: ${services ? services.length : 0})`);

            const [testFindInSet] = await connection.query("SELECT FIND_IN_SET('3', ?) as matched", [services]);
            console.log('FIND_IN_SET(\'3\', services):', testFindInSet[0].matched);
        }

        console.log('\n--- Checking Mapping Table for ID 25 ---');
        const [mappings] = await connection.query('SELECT * FROM vendor_service_mappings WHERE vendor_id = 25');
        console.log('Mappings for Vijay:', JSON.stringify(mappings, null, 2));

        console.log('\n--- Running exact query from partners.js for service_id 3 ---');
        const service_id = '3';
        const sql = `
        SELECT u.id, u.name, u.role, u.isactive, u.isapproved, u.services
        FROM Users u
        LEFT JOIN vendor_service_mappings vsm ON u.id = vsm.vendor_id
        WHERE u.role = 3 AND u.isactive = 1 AND u.isapproved = 1 
          AND (vsm.service_id = ? OR FIND_IN_SET(?, REPLACE(u.services, ' ', '')))
        GROUP BY u.id
    `;
        const [results] = await connection.query(sql, [service_id, service_id]);
        console.log('Query results for service_id 3:', JSON.stringify(results, null, 2));

    } catch (e) {
        console.error('Error during debugging:', e);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}
run();
