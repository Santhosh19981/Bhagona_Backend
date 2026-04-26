const pool = require('../src/db');

async function debugPending() {
  const query = `
    SELECT user_id AS id, name, email, role, mobile, experience, businessname, isapproved 
    FROM Users
    WHERE (role = '2' OR role = '3') AND isapproved = 0
  `;

  try {
    console.log("Executing query...");
    const [results] = await pool.query(query);
    console.log("Query successful! Found", results.length, "pending users.");
    console.log(results);
  } catch (err) {
    console.error("Database Error Detail:");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("SQL State:", err.sqlState);
    console.error("SQL:", err.sql);
  } finally {
    process.exit();
  }
}

debugPending();
