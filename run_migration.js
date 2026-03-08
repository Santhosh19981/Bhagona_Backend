const pool = require('./src/db');
const fs = require('fs');
require('dotenv').config();

async function migrate() {
    let log = '';
    try {
        log += 'Starting migration...\n';

        // 1. Create vendor_banners table
        log += 'Creating vendor_banners table...\n';
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_banners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                image_url LONGTEXT,
                title VARCHAR(255),
                description TEXT,
                link_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES Users(id) ON DELETE CASCADE
            )
        `);
        log += 'vendor_banners table created or already exists.\n';

        // 2. Create vendor_reviews table (if not exists)
        log += 'Creating vendor_reviews table...\n';
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                customer_id INT NOT NULL,
                booking_id INT,
                rating DECIMAL(2,1) NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (customer_id) REFERENCES Users(id) ON DELETE CASCADE
            )
        `);
        log += 'vendor_reviews table created or already exists.\n';

        // 3. Update Users table with business description if not present
        // (Checking existing fields from profiles.js, it already has 'describe', 'businessname', 'address')
        // We'll just ensure they are handled properly in the UI.

        log += 'Migration completed successfully.\n';
    } catch (err) {
        log += 'ERROR: ' + err.message + '\n';
    } finally {
        fs.writeFileSync('migration_log.txt', log);
        process.exit();
    }
}

migrate();
