const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('fs'); // wait I imported fs twice

async function run() {
    let connection;
    try {
        const env = require('fs').readFileSync('.env', 'utf8');
        const host = env.match(/DB_HOST=(.*)/)[1].trim();
        const user = env.match(/DB_USER=(.*)/)[1].trim();
        const password = env.match(/DB_PASSWORD=(.*)/)[1].trim();
        const database = env.match(/DB_NAME=(.*)/)[1].trim();
        const port = env.match(/DB_PORT=(.*)/)[1].trim();

        connection = await mysql.createConnection({
            host, user, password, database, port: Number(port)
        });

        const [services] = await connection.query("SELECT service_id, name FROM services WHERE name LIKE '%Poultry%' OR service_id = 3 OR service_id = 43");

        const [users] = await connection.query("SELECT id, name, services FROM Users WHERE name LIKE '%Vijay%' OR id = 25");

        const result = {
            services,
            users
        };

        require('fs').writeFileSync('final_check.json', JSON.stringify(result, null, 2), 'utf8');
        console.log('Done');
    } catch (e) {
        require('fs').writeFileSync('final_check.json', 'Error: ' + e.message, 'utf8');
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}
run();
