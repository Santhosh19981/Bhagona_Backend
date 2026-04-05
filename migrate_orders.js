const pool = require('./src/db');

async function migrate() {
    try {
        console.log('Starting migration for orders table...');
        
        // 1. Alter order_id to VARCHAR(10)
        // This will also remove AUTO_INCREMENT
        await pool.query('ALTER TABLE orders MODIFY order_id VARCHAR(10) NOT NULL');
        console.log('order_id column modified to VARCHAR(10).');
        
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
