const pool = require('./src/db');

async function checkVendors() {
  try {
    const [rows] = await pool.query("SELECT user_id, first_name, last_name, role, image_url, image_data, profile_image FROM Users WHERE role = 'vendor'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVendors();
