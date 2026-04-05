const pool = require('./src/db');
require('dotenv').config();

async function rebuildBookings() {
    console.log('🔄 Starting bookings system rebuild...');

    try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        const dropTables = [
            'vendor_order_acceptance',
            'chef_order_acceptance',
            'vendor_bookings',
            'chef_bookings',
            'booking_menu_items',
            'bookings'
        ];

        for (let t of dropTables) {
            console.log(`⏳ Dropping ${t}...`);
            await pool.query(`DROP TABLE IF EXISTS ${t}`);
        }

        console.log('⏳ Creating table: bookings...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                booking_id INT AUTO_INCREMENT PRIMARY KEY,
                customer_user_id INT NOT NULL,
                event_id INT,
                service_id INT,
                event_date DATE NOT NULL,
                total_members INT DEFAULT 0,
                veg_guests INT DEFAULT 0,
                non_veg_guests INT DEFAULT 0,
                booking_type ENUM('chef_booking', 'catering_booking', 'service_booking', 'full_event_booking') NOT NULL,
                status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'upcoming') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_user_id) REFERENCES Users (user_id),
                FOREIGN KEY (event_id) REFERENCES Events (event_id),
                FOREIGN KEY (service_id) REFERENCES services (service_id)
            ) ENGINE=InnoDB
        `);

        console.log('⏳ Creating table: chef_bookings...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chef_bookings (
                booking_id INT PRIMARY KEY,
                primary_chef_user_id INT,
                alternate_chef1_user_id INT,
                alternate_chef2_user_id INT,
                FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
                FOREIGN KEY (primary_chef_user_id) REFERENCES Users (user_id),
                FOREIGN KEY (alternate_chef1_user_id) REFERENCES Users (user_id),
                FOREIGN KEY (alternate_chef2_user_id) REFERENCES Users (user_id)
            ) ENGINE=InnoDB
        `);

        console.log('⏳ Creating table: vendor_bookings...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_bookings (
                booking_id INT PRIMARY KEY,
                primary_vendor_user_id INT,
                alternate_vendor1_user_id INT,
                alternate_vendor2_user_id INT,
                FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
                FOREIGN KEY (primary_vendor_user_id) REFERENCES Users (user_id),
                FOREIGN KEY (alternate_vendor1_user_id) REFERENCES Users (user_id),
                FOREIGN KEY (alternate_vendor2_user_id) REFERENCES Users (user_id)
            ) ENGINE=InnoDB
        `);

        console.log('⏳ Creating table: chef_order_acceptance...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chef_order_acceptance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                chef_user_id INT NOT NULL,
                acceptance_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
                FOREIGN KEY (chef_user_id) REFERENCES Users (user_id)
            ) ENGINE=InnoDB
        `);

        console.log('⏳ Creating table: vendor_order_acceptance...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_order_acceptance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                vendor_user_id INT NOT NULL,
                acceptance_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
                FOREIGN KEY (vendor_user_id) REFERENCES Users (user_id)
            ) ENGINE=InnoDB
        `);

        console.log('⏳ Creating table: booking_menu_items...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items (menu_item_id)
            ) ENGINE=InnoDB
        `);

        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✨ Bookings system rebuild complete!');

    } catch (err) {
        console.error('💥 Critical error during rebuild:', err.message);
    } finally {
        process.exit();
    }
}

rebuildBookings();
