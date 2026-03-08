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

        console.log('Connected to DB');

        const [vendors] = await connection.query('SELECT id, name, role, isactive, isapproved, services FROM Users WHERE name LIKE "%Vijay%"');
        console.log('Vijay data:', JSON.stringify(vendors, null, 2));

        if (vendors.length > 0) {
            const vendorId = vendors[0].id;
            const [mappings] = await connection.query('SELECT * FROM vendor_service_mappings WHERE vendor_id = ?', [vendorId]);
            console.log('Mappings for Vijay:', JSON.stringify(mappings, null, 2));
        }

        const [allMappings] = await connection.query('SELECT * FROM vendor_service_mappings');
        console.log('Total mappings in table:', allMappings.length);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}
run();
