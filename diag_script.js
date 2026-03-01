const mysql = require("mysql2/promise");
const fs = require('fs');

async function check() {
    let connection;
    let output = "";
    try {
        // Hardcoded from .env seen earlier
        connection = await mysql.createConnection({
            host: '82.25.121.30',
            port: 3306,
            user: 'u385969042_test_user',
            password: 'Bhagonatest@1998',
            database: 'u385969042_test_db'
        });

        output += "--- SERVICES TABLE --- \n";
        const [services] = await connection.query('SELECT * FROM services LIMIT 5');
        output += JSON.stringify(services, null, 2) + "\n\n";

        output += "--- USER 25 --- \n";
        const [user] = await connection.query('SELECT id, name, services FROM users WHERE id = 25');
        output += JSON.stringify(user, null, 2) + "\n\n";

        if (user.length > 0) {
            const raw = user[0].services;
            output += `Raw Services String: [${raw}] (Length: ${raw ? raw.length : 0})\n`;

            output += "--- FIND_IN_SET TEST --- \n";
            const [test] = await connection.query('SELECT s.service_id, s.name, FIND_IN_SET(s.service_id, ?) as matched FROM services s', [raw]);
            output += JSON.stringify(test, null, 2) + "\n";
        }

        fs.writeFileSync('D:\\Angualr Projects\\Bhagona\\Bhagona_backend\\diag.txt', output);
        console.log('Results written to diag.txt');

    } catch (err) {
        fs.writeFileSync('D:\\Angualr Projects\\Bhagona\\Bhagona_backend\\diag.txt', 'Error: ' + err.message);
    } finally {
        if (connection) await connection.end();
    }
}

check();
