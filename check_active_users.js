const pool = require('./src/db');

async function checkUsers() {
  try {
    const [rows] = await pool.query("SELECT user_id, name, businessname, role_id, status FROM Users WHERE status = 'active'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
