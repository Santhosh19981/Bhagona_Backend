const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bhagona_db'
  });

  const vendor_id = 25;
  try {
    const [rows] = await conn.query(`
      SELECT DISTINCT s.service_id, s.name 
      FROM services s 
      LEFT JOIN Users u ON u.user_id = ? 
      WHERE FIND_IN_SET(s.service_id, REPLACE(u.services, ' ', ''))
    `, [vendor_id]);
    console.log('✅ Success! Found ' + rows.length + ' services for vendor ' + vendor_id);
  } catch (e) {
    console.error('❌ Query failed:', e.message);
  } finally {
    await conn.end();
  }
})();
