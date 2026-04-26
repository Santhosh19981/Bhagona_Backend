const db = require('./src/db');

async function forceUpdate() {
  try {
    console.log('Force updating booking 54 to "accepted"...');
    const [res] = await db.query("UPDATE bookings SET status = 'accepted' WHERE booking_id = 54");
    console.log('Update Result:', res);
    
    const [rows] = await db.query("SELECT status FROM bookings WHERE booking_id = 54");
    console.log('New Status:', rows[0].status);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

forceUpdate();
