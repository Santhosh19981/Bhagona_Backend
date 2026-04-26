const pool = require('../src/db');

async function inspectData() {
  try {
    const [users] = await pool.query("SELECT user_id, name, role FROM Users WHERE role = 1 LIMIT 5");
    console.log("Admin Users:");
    console.table(users);

    const [vendors] = await pool.query("SELECT user_id, name, isapproved, approvedby FROM Users WHERE role IN (2, 3) LIMIT 5");
    console.log("Vendors/Partners:");
    console.table(vendors);
  } catch (err) {
    console.error("Error inspecting data:", err.message);
  } finally {
    process.exit();
  }
}

inspectData();
