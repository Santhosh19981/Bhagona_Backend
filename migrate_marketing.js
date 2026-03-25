const pool = require('./src/db');

async function migrate() {
    try {
        console.log("Starting migration...");
        
        // 1. Update vendor_banners table
        console.log("Updating vendor_banners table...");
        try {
            await pool.query('ALTER TABLE vendor_banners ADD COLUMN service_id INT NULL');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column service_id already exists.");
            } else {
                throw e;
            }
        }
        
        // 2. Create vendor_offers table
        console.log("Creating vendor_offers table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_offers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                service_id INT NULL,
                coupon_code VARCHAR(50) NOT NULL,
                title VARCHAR(255) NULL,
                description TEXT NULL,
                start_date DATE NULL,
                end_date DATE NULL,
                usage_limit_per_user INT DEFAULT 1,
                is_active TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
