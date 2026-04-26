const db = require('./src/db');

async function listTables() {
  try {
    const [rows] = await db.query("SHOW TABLES");
    console.log('Tables:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

listTables();
