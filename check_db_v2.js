const mysql = require("mysql2/promise");
require('dotenv').config();

async function check() {
    console.log('Starting DB check...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('Connected to DB');

        const [users] = await connection.query('SELECT id, name, services FROM users WHERE id = 25');
        console.log('User 25 data:', JSON.stringify(users, null, 2));

        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in DB:', tables.map(t => Object.values(t)[0]));

        if (tables.some(t => Object.values(t)[0] === 'vendor_service_mappings')) {
            const [mappings] = await connection.query('SELECT * FROM vendor_service_mappings WHERE vendor_id = 25');
            console.log('Mappings for User 25:', mappings);
        } else {
            console.log('vendor_service_mappings table DOES NOT EXIST');
        }

    } catch (err) {
        console.error('DB Error:', err.message);
    } finally {
        if (connection) await connection.end();
        console.log('Done.');
    }
}

check();
