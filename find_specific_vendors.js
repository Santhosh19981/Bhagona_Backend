const pool = require('./src/db');

async function findVendors() {
  try {
    const [rows] = await pool.query("SELECT user_id, name, businessname, role FROM Users WHERE businessname IN ('Vijay Poultary', 'Elite Meats', 'Apex Catering') OR name IN ('vijay', 'elite', 'apex')");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findVendors();
