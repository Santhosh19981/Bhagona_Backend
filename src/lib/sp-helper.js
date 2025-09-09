const pool = require('../db');

async function callProcedureWithOut(procCall, params, outVarName) {
  // procCall: "CALL Proc(?, ?, @out); SELECT @out as outval;"
  try {
    const conn = await pool.getConnection();
    try {
      const [results] = await conn.query(procCall, params);
      // When multipleStatements true, results may be array; last set contains the SELECT @out result
      return results;
    } finally {
      conn.release();
    }
  } catch (err) {
    throw err;
  }
}

module.exports = { callProcedureWithOut };
