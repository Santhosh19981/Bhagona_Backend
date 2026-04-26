const db = require('./src/db');

async function checkSchema() {
  try {
    const [rows] = await db.query("DESCRIBE bookings");
    console.log('Bookings Schema:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

checkSchema();
