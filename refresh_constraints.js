const pool = require('./src/db');
require('dotenv').config();

async function refreshConstraints() {
    try {
        console.log('🔄 Starting constraint refresh...');
        
        // 1. Drop existing constraint
        try {
            await pool.query('ALTER TABLE bookings DROP FOREIGN KEY bookings_ibfk_1');
            console.log('✅ Dropped: bookings_ibfk_1');
        } catch (err) {
            console.warn('⚠️ Warning: Could not drop bookings_ibfk_1 (it might not exist):', err.message);
        }

        // 2. Clear old bookings to avoid existing data errors (since it's a demo)
        // Wait, better to keep them if they are valid.
        
        // 3. Re-add constraint correctly naming the table 'Users'
        console.log('⏳ Re-adding constraint: bookings_ibfk_1 (References Users.user_id)...');
        await pool.query('ALTER TABLE bookings ADD CONSTRAINT bookings_ibfk_1 FOREIGN KEY (customer_user_id) REFERENCES Users (user_id)');
        console.log('✅ Re-added: bookings_ibfk_1');

        // 4. Test insertion
        console.log('🚀 Final Verification: Attempting test booking insert for user 26...');
        const testBooking = {
            customer_user_id: 26,
            event_date: '2026-04-02',
            booking_type: 'service_booking',
            primary_vendor_user_id: 25
        };
        
        const [result] = await pool.query(
            'INSERT INTO bookings (customer_user_id, event_date, booking_type, primary_vendor_user_id) VALUES (?, ?, ?, ?)',
            [testBooking.customer_user_id, testBooking.event_date, testBooking.booking_type, testBooking.primary_vendor_user_id]
        );
        
        console.log('✨ SUCCESS! Test booking created with ID:', result.insertId);
        
        // Clean up test booking
        await pool.query('DELETE FROM bookings WHERE booking_id = ?', [result.insertId]);
        console.log('🗑️ Test booking cleaned up.');

    } catch (err) {
        console.error('💥 Critical error during constraint refresh:', err.message);
    } finally {
        process.exit();
    }
}

refreshConstraints();
