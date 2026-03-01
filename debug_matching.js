const mysql = require("mysql2/promise");
require('dotenv').config();

async function debug() {
    console.log('--- Deep Debug ---');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // 1. Check Service IDs
        const [services] = await connection.query('SELECT service_id, name FROM services');
        console.log('Services in Table:', services);

        // 2. Check User 25 raw services string
        const [users] = await connection.query('SELECT id, name, services FROM users WHERE id = 25');
        if (users.length > 0) {
            const rawServices = users[0].services;
            console.log(`User 25 Services Raw: "${rawServices}" (Type: ${typeof rawServices})`);

            if (rawServices) {
                const ids = rawServices.split(',');
                console.log('Split IDs:', ids.map(id => `"${id}"`));

                // 3. Test FIND_IN_SET manually in query
                for (const s of services) {
                    const [test] = await connection.query('SELECT FIND_IN_SET(?, ?) as matched', [s.service_id, rawServices]);
                    console.log(`Testing Service ${s.service_id} (${s.name}) against "${rawServices}": Matched=${test[0].matched}`);
                }
            }
        } else {
            console.log('User 25 not found!');
        }

    } catch (err) {
        console.error('Debug Error:', err.message);
    } finally {
        if (connection) await connection.end();
        console.log('Done.');
    }
}

debug();
