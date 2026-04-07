const pool = require('./src/db');

async function checkRoles() {
  try {
    const [rows] = await pool.query("SELECT * FROM Roles");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkRoles();
