const pool = require('./src/db');

async function listVendors() {
  const [rows] = await pool.query("SELECT user_id, businessname FROM Users WHERE businessname IS NOT NULL");
  rows.forEach(r => {
    console.log(`${r.user_id}: ${r.businessname}`);
  });
  process.exit(0);
}

listVendors();
