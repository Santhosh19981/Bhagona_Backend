const pool = require('./src/db');
require('dotenv').config();

async function force() {
    try {
        console.log('🔄 Forced Booking Test...');
        
        // 1. Check User 26
        const [u26] = await pool.query('SELECT user_id, name FROM Users WHERE user_id = 26');
        console.log('User 26:', JSON.stringify(u26[0]));

        // 2. Check Vendor 25
        const [v25] = await pool.query('SELECT user_id, name FROM Users WHERE user_id = 25');
        console.log('Vendor 25:', JSON.stringify(v25[0]));

        if (!u26[0] || !v25[0]) {
            console.error('❌ Data missing!');
            process.exit(1);
        }

        // 3. Attempt Call using exact SQL from backend
        console.log('⏳ Calling CreateBooking...');
        const sql = `CALL CreateBooking(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @new_booking_id); SELECT @new_booking_id as booking_id;`;
        const params = [
            26, // p_customer_user_id
            null, // p_event_id
            null, // p_service_id
            '2026-04-02', // p_event_date
            0, 0, 0, // total, veg, non-veg
            'service_booking', // p_booking_type
            null, null, null, // chefs
            25, // p_primary_vendor_user_id
            null, null // alt vendors
        ];
        
        const [results] = await pool.query(sql, params);
        console.log('✅ Success! Results:', JSON.stringify(results, null, 2));

    } catch (err) {
        console.error('💥 Failure:', err.message);
    } finally {
        process.exit();
    }
}
force();
