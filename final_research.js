const pool = require('./src/db');

async function research() {
  try {
    const [cols] = await pool.query("DESCRIBE Users");
    console.log("Columns:", cols.map(c => c.Field).join(', '));

    const [vendors] = await pool.query("SELECT user_id, name, businessname, role FROM Users WHERE businessname LIKE '%Vijay%' OR businessname LIKE '%Elite%' OR businessname LIKE '%Apex%' OR name LIKE '%vijay%'");
    console.log("Vendors found:", JSON.stringify(vendors, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

research();
