const pool = require('./src/db');
require('dotenv').config();

async function checkVars() {
    try {
        const [rows] = await pool.query("SHOW VARIABLES LIKE 'lower_case_table_names'");
        console.log('lower_case_table_names:', JSON.stringify(rows[0]));
        
        const [users] = await pool.query("SELECT user_id, name FROM Users WHERE user_id = 26");
        console.log('User 26 in Users:', JSON.stringify(users[0]));

        const [tables] = await pool.query("SHOW TABLES");
        console.log('All Tables:', JSON.stringify(tables.map(t => Object.values(t)[0])));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkVars();
