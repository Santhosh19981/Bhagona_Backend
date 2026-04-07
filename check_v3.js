const pool = require('./src/db');

async function checkVendors() {
  try {
    const [rows] = await pool.query("SELECT user_id, name, businessname, role FROM Users WHERE businessname LIKE '%Vijay%' OR businessname LIKE '%Elite%' OR businessname LIKE '%Apex%' OR name LIKE '%vijay%'");
    rows.forEach(r => {
      console.log(`ID: ${r.user_id} | Name: ${r.name} | Business: ${r.businessname} | Role: ${r.role}`);
    });
    const [cols] = await pool.query("DESCRIBE Users");
    console.log("Cols: " + cols.map(c => c.Field).join(', '));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVendors();
