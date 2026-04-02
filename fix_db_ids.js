const pool = require('./src/db');
require('dotenv').config();

async function fixIds() {
    console.log('🔄 Starting database ID synchronization...');

    const tablesToFix = [
        { table: 'Users', oldId: 'id', newId: 'user_id' },
        { table: 'Events', oldId: 'id', newId: 'event_id' },
        { table: 'menu_categories', oldId: 'id', newId: 'menu_category_id' },
        { table: 'menu_subcategories', oldId: 'id', newId: 'menu_subcategory_id' }
    ];

    try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        for (let task of tablesToFix) {
            try {
                // Check if table exists
                const [tables] = await pool.query('SHOW TABLES LIKE ?', [task.table]);
                if (tables.length === 0) {
                    console.log(`⚠️ Table ${task.table} not found, skipping.`);
                    continue;
                }

                // Check columns
                const [cols] = await pool.query(`DESCRIBE ${task.table}`);
                const hasOld = cols.some(c => c.Field === task.oldId);
                const hasNew = cols.some(c => c.Field === task.newId);

                if (hasOld && !hasNew) {
                    console.log(`⏳ Renaming ${task.table}.${task.oldId} to ${task.newId}...`);
                    // Find out the type and extra for the old ID column
                    const oldCol = cols.find(c => c.Field === task.oldId);
                    const colDef = `${oldCol.Type} ${oldCol.Null === 'NO' ? 'NOT NULL' : ''} ${oldCol.Extra}`.trim();
                    
                    await pool.query(`ALTER TABLE ${task.table} CHANGE COLUMN ${task.oldId} ${task.newId} ${colDef}`);
                    console.log(`✅ Fixed: ${task.table}`);
                } else if (hasNew) {
                    console.log(`✅ ${task.table} already has ${task.newId}.`);
                } else {
                    console.log(`⚠️ Table ${task.table} does not have column ${task.oldId}.`);
                }
            } catch (err) {
                console.error(`❌ Error fixing ${task.table}:`, err.message);
            }
        }

        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✨ ID synchronization complete!');

    } catch (err) {
        console.error('💥 Critical error during ID fix:', err.message);
    } finally {
        process.exit();
    }
}

fixIds();
