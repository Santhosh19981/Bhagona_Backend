const db = require('../src/db');
async function fixSchema() {
    try {
        console.log('Dropping incorrect foreign key...');
        await db.query('ALTER TABLE vendor_bank_accounts DROP FOREIGN KEY vendor_bank_accounts_ibfk_1');
        
        console.log('Adding correct foreign key referencing Users(user_id)...');
        await db.query('ALTER TABLE vendor_bank_accounts ADD CONSTRAINT vendor_bank_accounts_ibfk_1 FOREIGN KEY (vendor_user_id) REFERENCES Users(user_id) ON DELETE CASCADE');
        
        console.log('Schema fixed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing schema:', err.message);
        process.exit(1);
    }
}
fixSchema();
