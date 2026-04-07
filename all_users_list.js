const pool = require('./src/db');

async function allVendors() {
  try {
    const [rows] = await pool.query("SELECT user_id, name, businessname, rating FROM Users");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

allVendors();
