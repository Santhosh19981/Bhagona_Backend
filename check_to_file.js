const mysql = require("mysql2/promise");
const fs = require('fs');
require('dotenv').config();

async function check() {
    let connection;
    let output = "";
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [tables] = await connection.query('SHOW TABLES');
        output += `Tables: ${JSON.stringify(tables)}\n\n`;

        const [servicesColumns] = await connection.query('DESCRIBE services');
        output += `Services Table Columns: ${JSON.stringify(servicesColumns, null, 2)}\n\n`;

        const [services] = await connection.query('SELECT * FROM services');
        output += `Services Data: ${JSON.stringify(services, null, 2)}\n\n`;

        const [user25] = await connection.query('SELECT id, services FROM users WHERE id = 25');
        output += `User 25 Data: ${JSON.stringify(user25, null, 2)}\n\n`;

        const [testJoin] = await connection.query(`
            SELECT s.* 
            FROM services s 
            CROSS JOIN (SELECT services FROM users WHERE id = 25) u 
            WHERE FIND_IN_SET(s.service_id, u.services)
        `);
        output += `Manual Join Test: ${JSON.stringify(testJoin, null, 2)}\n\n`;

        fs.writeFileSync('db_check_results.txt', output);
        console.log('Results written to db_check_results.txt');

    } catch (err) {
        fs.writeFileSync('db_check_results.txt', 'Error: ' + err.message);
    } finally {
        if (connection) await connection.end();
    }
}

check();
