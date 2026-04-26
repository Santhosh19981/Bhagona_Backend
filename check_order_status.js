const db = require('./src/db');

async function checkOrder() {
  try {
    const [rows] = await db.query("SELECT * FROM orders WHERE order_id = 'L7LB3X'");
    console.log('Order Details:', JSON.stringify(rows, null, 2));
    
    if (rows.length > 0) {
      const bookingId = rows[0].booking_id;
      const [booking] = await db.query("SELECT * FROM bookings WHERE booking_id = ?", [bookingId]);
      console.log('Booking Details:', JSON.stringify(booking, null, 2));
    } else {
      console.log('Order NOT FOUND in database');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

checkOrder();
