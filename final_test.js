const pool = require('./src/db');
require('dotenv').config();

async function finalTest() {
    try {
        console.log('--- FINAL TEST ---');
        console.log('1. Verifying user 26 exists...');
        const [users] = await pool.query('SELECT user_id FROM Users WHERE user_id = 26');
        console.log('User 26 found:', users.length > 0);

        if (users.length === 0) {
            console.log('❌ User 26 is missing! Re-adding...');
            await pool.query("INSERT INTO Users (user_id, name, mobile, email, password, role, isactive, isapproved) VALUES (26, 'Demo Customer', '9658626856', 'demo@bhagona.com', '1234', 4, 1, 1)");
            console.log('✅ User 26 re-added.');
        }

        console.log('2. Attempting raw INSERT into bookings...');
        try {
            const [res] = await pool.query(
                "INSERT INTO bookings (customer_user_id, event_date, booking_type) VALUES (26, '2026-04-02', 'service_booking')"
            );
            console.log('✅ Raw INSERT success! booking_id:', res.insertId);
            await pool.query('DELETE FROM bookings WHERE booking_id = ?', [res.insertId]);
        } catch (e) {
            console.error('❌ Raw INSERT failed:', e.message);
        }

        console.log('3. Attempting CALL CreateBooking...');
        try {
            // Procedure has 14 IN + 1 OUT
            const sql = 'CALL CreateBooking(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @new_booking_id); SELECT @new_booking_id as booking_id;';
            const params = [
                26, // p_customer_user_id
                null, null, '2026-04-02', 0, 0, 0, 'service_booking',
                null, null, null, 25, null, null
            ];
            const [res] = await pool.query(sql, params);
            console.log('✅ CALL CreateBooking success!');
        } catch (e) {
            console.error('❌ CALL CreateBooking failed:', e.message);
        }

    } catch (err) {
        console.error('💥 Error:', err.message);
    } finally {
        process.exit();
    }
}

finalTest();
