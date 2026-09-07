/**
 * Bhagona Database Cloning & Sync Tool
 * Clones schema (tables, constraints, stored procedures) from QA/Test database to Production database.
 * 
 * Usage:
 *   node clone_db.js
 *   node clone_db.js --with-data   (copies table data as well as schema)
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load configs
const qaEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.qa')));
const prodEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '.env.production')));

const copyData = process.argv.includes('--with-data');

async function cloneDatabase() {
  console.log('====================================================');
  console.log('🔄 Bhagona Database Clone & Sync Tool');
  console.log(`Source (QA): ${qaEnv.DB_HOST} -> ${qaEnv.DB_NAME}`);
  console.log(`Target (Prod): ${prodEnv.DB_HOST} -> ${prodEnv.DB_NAME}`);
  console.log(`Copy Data: ${copyData ? 'YES' : 'NO (Schema only)'}`);
  console.log('====================================================\n');

  let srcConn, destConn;

  try {
    // 1. Connect to Source (QA)
    console.log('🔌 Connecting to Source DB...');
    srcConn = await mysql.createConnection({
      host: qaEnv.DB_HOST,
      port: Number(qaEnv.DB_PORT || 3306),
      user: qaEnv.DB_USER,
      password: qaEnv.DB_PASSWORD,
      database: qaEnv.DB_NAME,
      multipleStatements: true
    });
    console.log('✅ Connected to Source DB successfully.');

    // 2. Connect to Destination (Prod)
    console.log('🔌 Connecting to Destination DB...');
    try {
      destConn = await mysql.createConnection({
        host: prodEnv.DB_HOST,
        port: Number(prodEnv.DB_PORT || 3306),
        user: prodEnv.DB_USER,
        password: prodEnv.DB_PASSWORD,
        database: prodEnv.DB_NAME,
        multipleStatements: true
      });
      console.log('✅ Connected to Destination DB successfully.');
    } catch (err) {
      console.error('❌ Could not connect to Destination DB: ' + err.message);
      console.log('\n💡 If the Production DB has not been created in Hostinger hPanel yet:');
      console.log('   1. Go to Hostinger hPanel -> Databases');
      console.log(`   2. Create database: "${prodEnv.DB_NAME}" with user "${prodEnv.DB_USER}"`);
      console.log('   3. Rerun: npm run clone:db\n');
      return;
    }

    // 3. Disable foreign keys temporarily on target
    await destConn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 4. Get all tables from Source
    const [tables] = await srcConn.query('SHOW FULL TABLES WHERE Table_Type = "BASE TABLE"');
    const tableNames = tables.map(r => Object.values(r)[0]);
    console.log(`📋 Found ${tableNames.length} tables in source DB.`);

    // 5. Clone Table Schemas
    for (const table of tableNames) {
      process.stdout.write(`  ⏳ Creating table: ${table}... `);
      const [[createResult]] = await srcConn.query(`SHOW CREATE TABLE \`${table}\``);
      const createSQL = createResult['Create Table'];

      await destConn.query(`DROP TABLE IF EXISTS \`${table}\``);
      await destConn.query(createSQL);
      console.log('✅');

      // Copy data if requested
      if (copyData) {
        const [rows] = await srcConn.query(`SELECT * FROM \`${table}\``);
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]);
          const cols = keys.map(k => `\`${k}\``).join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const insertSQL = `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`;

          for (const row of rows) {
            const values = keys.map(k => row[k]);
            await destConn.query(insertSQL, values);
          }
          console.log(`     ↳ Copied ${rows.length} rows.`);
        }
      }
    }

    // 6. Get all Stored Procedures from Source
    const [procs] = await srcConn.query(
      'SHOW PROCEDURE STATUS WHERE Db = ?',
      [qaEnv.DB_NAME]
    );
    console.log(`\n⚙️ Found ${procs.length} stored procedures in source DB.`);

    for (const proc of procs) {
      const procName = proc.Name;
      process.stdout.write(`  ⏳ Syncing procedure: ${procName}... `);
      try {
        const [[procDef]] = await srcConn.query(`SHOW CREATE PROCEDURE \`${procName}\``);
        const createProcSQL = procDef['Create Procedure'];

        await destConn.query(`DROP PROCEDURE IF EXISTS \`${procName}\``);
        await destConn.query(createProcSQL);
        console.log('✅');
      } catch (procErr) {
        console.log(`⚠️ Warning: ${procErr.message}`);
      }
    }

    // 7. Re-enable foreign keys
    await destConn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🎉 Database cloning & synchronization completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during database cloning:', error.message);
  } finally {
    if (srcConn) await srcConn.end();
    if (destConn) await destConn.end();
  }
}

cloneDatabase();
