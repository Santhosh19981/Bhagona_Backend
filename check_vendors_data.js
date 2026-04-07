const pool = require('./src/db');

async function checkVendors() {
  try {
    const [rows] = await pool.query("SELECT * FROM Users WHERE role = 'vendor' LIMIT 5");
    if (rows.length > 0) {
      console.log("Keys found:", Object.keys(rows[0]));
      console.log("Values found:", JSON.stringify(rows[0], null, 2));
    } else {
      console.log("No vendors found");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVendors();
