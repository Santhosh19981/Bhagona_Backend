const pool = require('./src/db');

async function migrate() {
    try {
        console.log('Starting migration to add customer columns to orders table...');
        
        // Add columns if they don't exist
        await pool.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) AFTER booking_id,
            ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) AFTER customer_name,
            ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(20) AFTER customer_email,
            ADD COLUMN IF NOT EXISTS customer_address TEXT AFTER customer_mobile
        `);
        
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
