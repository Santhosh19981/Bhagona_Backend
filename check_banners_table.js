const db = require('./src/db');

async function check() {
    try {
        const [rows] = await db.query('SHOW TABLES LIKE "vendor_banners"');
        if (rows.length > 0) {
            console.log('✅ Table vendor_banners exists');
            const [columns] = await db.query('DESCRIBE vendor_banners');
            console.log('Columns:', columns);
        } else {
            console.log('❌ Table vendor_banners DOES NOT EXIST');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
