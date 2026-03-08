const pool = require('./src/db');
require('dotenv').config();

async function inspect() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables:', tableNames);

        for (const tableName of tableNames) {
            console.log(`\n--- DESCRIBE ${tableName} ---`);
            const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);
            console.table(columns);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

inspect();
