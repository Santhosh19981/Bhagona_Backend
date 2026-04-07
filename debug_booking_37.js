const pool = require('./src/db');

async function debugBooking(id) {
  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [id]);
    console.log('Booking Table Data:', JSON.stringify(booking, null, 2));

    const [chefStatus] = await pool.query('SELECT * FROM chef_order_acceptance WHERE booking_id = ?', [id]);
    console.log('Chef Acceptance logs:', JSON.stringify(chefStatus, null, 2));

    const [vendorStatus] = await pool.query('SELECT * FROM vendor_order_acceptance WHERE booking_id = ?', [id]);
    console.log('Vendor Acceptance logs:', JSON.stringify(vendorStatus, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugBooking(37);
