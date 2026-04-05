const pool = require('./src/db');
require('dotenv').config();

async function compare() {
    try {
        console.log('--- COMPARING ID TYPES ---');
        const [usersIdCol] = await pool.query("SELECT COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'user_id'");
        const [bookingsIdCol] = await pool.query("SELECT COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_user_id'");
        
        console.log('Users.user_id:', JSON.stringify(usersIdCol[0]));
        console.log('bookings.customer_user_id:', JSON.stringify(bookingsIdCol[0]));

        const [constraint] = await pool.query("SELECT * FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_user_id'");
        console.log('Constraint:', JSON.stringify(constraint[0]));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
compare();
