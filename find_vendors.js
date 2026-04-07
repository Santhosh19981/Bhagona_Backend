const pool = require('./src/db');

async function findVendors() {
  try {
    const [rows] = await pool.query("SELECT * FROM Users WHERE name LIKE '%Vijay%' OR name LIKE '%Elite%' OR name LIKE '%Apex%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findVendors();
