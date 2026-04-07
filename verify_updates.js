const pool = require('./src/db');

async function verify() {
  const [rows] = await pool.query("SELECT user_id, businessname, image FROM Users WHERE user_id IN (25, 34, 35, 27, 28, 29, 30, 31, 32, 33, 36)");
  rows.forEach(r => {
    console.log(`ID: ${r.user_id} | Biz: ${r.businessname} | Img: ${r.image}`);
  });
  process.exit(0);
}

verify();
