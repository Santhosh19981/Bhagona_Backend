const pool = require('./src/db');

async function checkSchema() {
  try {
    const [rows] = await pool.query("DESCRIBE Users");
    console.log(JSON.stringify(rows));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
