const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bhagona_db'
  });

  try {
    const [vendors] = await conn.execute('SELECT COUNT(*) as count FROM Users WHERE role = "vendor"');
    const [mappings] = await conn.execute('SELECT COUNT(*) as count FROM vendor_service_mappings');
    const [itemMappings] = await conn.execute('SELECT COUNT(*) as count FROM vendor_item_mappings');
    const [brokenImages] = await conn.execute('SELECT COUNT(*) as count FROM service_items WHERE image_url IS NULL OR image_url = ""');

    console.log('--- Database Summary ---');
    console.log('Total Vendors:', vendors[0].count);
    console.log('Total Service Mappings:', mappings[0].count);
    console.log('Total Item Mappings:', itemMappings[0].count);
    console.log('Items with Broken Images:', brokenImages[0].count);
  } catch (e) {
    console.error('❌ Verification failed:', e.message);
  } finally {
    await conn.end();
  }
})();
