const db = require('./src/db');

async function updateEnum() {
  try {
    console.log('Updating bookings.status ENUM to include "accepted" and "processing"...');
    await db.query(`ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'upcoming', 'accepted', 'processing') DEFAULT 'pending'`);
    console.log('ENUM updated successfully!');
    
    // Now try to set it to accepted again for booking 54
    await db.query("UPDATE bookings SET status = 'accepted' WHERE booking_id = 54");
    const [rows] = await db.query("SELECT status FROM bookings WHERE booking_id = 54");
    console.log('New Status for booking 54:', rows[0].status);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

updateEnum();
