const pool = require('./src/db');

async function checkVendors() {
  try {
    const [rows] = await pool.query("SELECT user_id, name, businessname, rating, image FROM Users WHERE role = 3 OR role = 'vendor' OR role = 'Provider'");
    rows.forEach(r => {
      console.log(`ID: ${r.user_id} | Biz: ${r.businessname} | Name: ${r.name} | Rating: ${r.rating}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVendors();
