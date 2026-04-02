const pool = require('./src/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function syncProcedures() {
    console.log('🔄 Starting procedure synchronization...');
    let successCount = 0;
    let failedCount = 0;

    try {
        const sqlPath = path.join(__dirname, 'sql', 'procedures.sql');
        if (!fs.existsSync(sqlPath)) {
            console.error('❌ sql/procedures.sql not found!');
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by $$ to separate each procedure
        // Filter out DELIMITER lines and empty strings
        const procedures = sqlContent
            .split('$$')
            .map(p => p.trim())
            .filter(p => p.length > 0 && !p.toUpperCase().startsWith('DELIMITER'));

        for (let proc of procedures) {
            // Clean up any trailing 'DELIMITER ;' if it was part of the last split
            if (proc.toUpperCase().includes('DELIMITER ;')) {
                proc = proc.split(/DELIMITER\s+;/i)[0].trim();
            }

            // Extract procedure name for logging/dropping
            const nameMatch = proc.match(/CREATE\s+PROCEDURE\s+([A-Za-z0-9_]+)/i);
            if (!nameMatch) continue;
            
            const procName = nameMatch[1];
            try {
                console.log(`⏳ Syncing procedure: ${procName}...`);
                
                // 1. Drop existing procedure
                await pool.query(`DROP PROCEDURE IF EXISTS ${procName}`);
                
                // 2. Create the procedure
                await pool.query(proc);
                
                console.log(`✅ Fixed: ${procName}`);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to sync ${procName}:`, err.message);
                failedCount++;
            }
        }

        console.log('\n--- Sync Summary ---');
        console.log(`Total Synced: ${successCount}`);
        console.log(`Total Failed: ${failedCount}`);
        
        if (failedCount === 0) {
            console.log('\n✨ Database procedures are now up to date!');
        } else {
            console.log('\n⚠️ Some procedures could not be synced. Check the errors above.');
        }

    } catch (err) {
        console.error('💥 Critical error during sync:', err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

syncProcedures();
