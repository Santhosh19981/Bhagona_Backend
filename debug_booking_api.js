const db = require('./src/db');

async function debugBooking() {
  const id = 54;
  try {
    console.log('1. Fetching booking...');
    const [[booking]] = await db.query('SELECT * FROM bookings WHERE booking_id = ? LIMIT 1', [id]);
    console.log('Booking:', booking ? 'Found' : 'Not Found');
    
    console.log('2. Fetching items...');
    const [items] = await db.query(`
      SELECT bmi.*, 
        COALESCE(bmi.item_name, mi.name, si.name, 'Service Item') AS item_name
      FROM booking_menu_items bmi 
      LEFT JOIN menu_items mi ON bmi.menu_item_id = mi.menu_item_id
      LEFT JOIN service_items si ON bmi.service_item_id = si.service_id
      WHERE bmi.booking_id = ?
    `, [id]);
    console.log('Items count:', items.length);

    console.log('3. Fetching chef status...');
    const [chefStatus] = await db.query('SELECT coa.*, u.name FROM chef_order_acceptance coa JOIN Users u ON coa.chef_user_id = u.user_id WHERE coa.booking_id = ?', [id]);
    console.log('Chef status count:', chefStatus.length);

    console.log('4. Fetching vendor status...');
    const [vendorStatus] = await db.query('SELECT voa.*, u.name FROM vendor_order_acceptance voa JOIN Users u ON voa.vendor_user_id = u.user_id WHERE voa.booking_id = ?', [id]);
    console.log('Vendor status count:', vendorStatus.length);

    console.log('5. Fetching order...');
    const [[order]] = await db.query('SELECT * FROM orders WHERE booking_id = ? LIMIT 1', [id]);
    console.log('Order:', order ? 'Found' : 'Not Found');

    console.log('DONE - NO ERRORS LOCALLY');
  } catch (err) {
    console.error('❌ ERROR AT STEP:', err.message);
    console.error(err);
  } finally {
    process.exit();
  }
}

debugBooking();
