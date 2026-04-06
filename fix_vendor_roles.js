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
    // Role ID 3 is 'vendor' based on our check: 1:customer, 2:chef, 3:vendor, 4:admin, 9:event_manager
    const [result] = await conn.execute("UPDATE Users SET role = 3 WHERE (role = 0 OR role = 'vendor') AND email LIKE '%@bhagona.com'");
    console.log('✅ Successfully fixed roles for ' + result.affectedRows + ' vendors.');
  } catch (e) {
    console.error('❌ Role fix failed:', e.message);
  } finally {
    await conn.end();
  }
})();
