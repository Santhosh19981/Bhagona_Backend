const pool = require('./src/db');

async function inspectProcedure() {
  try {
    const [rows] = await pool.query('SHOW CREATE PROCEDURE RespondToBooking');
    console.log(rows[0]['Create Procedure']);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectProcedure();
