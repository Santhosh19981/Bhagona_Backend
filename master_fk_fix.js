const pool = require('./src/db');
require('dotenv').config();

async function masterFix() {
    try {
        console.log('🔄 Performing Master Foreign Key Fix...');
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        const fkFixes = [
            { table: 'bookings', fk: 'bookings_ibfk_1', col: 'customer_user_id', refTable: 'Users', refCol: 'user_id' },
            { table: 'chef_order_acceptance', fk: 'chef_order_acceptance_ibfk_2', col: 'chef_user_id', refTable: 'Users', refCol: 'user_id' },
            { table: 'vendor_order_acceptance', fk: 'vendor_order_acceptance_ibfk_2', col: 'vendor_user_id', refTable: 'Users', refCol: 'user_id' }
        ];

        for (let fix of fkFixes) {
            try {
                console.log(`⏳ Dropping ${fix.fk} on ${fix.table}...`);
                await pool.query(`ALTER TABLE ${fix.table} DROP FOREIGN KEY ${fix.fk}`);
            } catch (e) {
                console.warn(`⚠️ Could not drop ${fix.fk}, skip.`);
            }
            console.log(`⏳ Re-adding ${fix.fk} on ${fix.table} referencing ${fix.refTable}(${fix.refCol})...`);
            await pool.query(`ALTER TABLE ${fix.table} ADD CONSTRAINT ${fix.fk} FOREIGN KEY (${fix.col}) REFERENCES ${fix.refTable} (${fix.refCol})`);
        }

        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✨ Master FK sync complete!');

    } catch (err) {
        console.error('💥 Master Fix failed:', err.message);
    } finally {
        process.exit();
    }
}

masterFix();
