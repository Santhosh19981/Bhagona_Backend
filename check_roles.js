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
    const [rows] = await conn.execute('SELECT * FROM roles');
    console.table(rows);
    const [users] = await conn.execute('SELECT user_id, name, role FROM Users LIMIT 10');
    console.table(users);
  } catch (e) {
    console.error('❌ Check failed:', e.message);
  } finally {
    await conn.end();
  }
})();
