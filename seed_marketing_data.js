const pool = require('./src/db');

async function seed() {
    try {
        console.log("Seeding marketing data...");
        
        // 1. Seed Banners for Vijay (3) and Poultry (3)
        await pool.query(`
            INSERT INTO vendor_banners (vendor_id, service_id, title, description, image_url, is_active)
            VALUES 
            (18, 3, 'Fresh Poultry Special', 'Get the freshest chicken and mutton at wholesale prices.', 'https://img.freepik.com/free-photo/raw-chicken-meat-white-background_1203-1614.jpg', 1),
            (18, 3, 'Weekend Meat Bonanza', 'Exclusive 20% off on all mutton orders this weekend.', 'https://img.freepik.com/free-photo/raw-lamb-chops-white-background_1203-1612.jpg', 1)
        `);
        console.log("Banners seeded.");

        // 2. Seed Offers for Vijay (3) and Poultry (3)
        await pool.query(`
            INSERT INTO vendor_offers (vendor_id, service_id, coupon_code, title, description, start_date, end_date, usage_limit_per_user, is_active)
            VALUES 
            (18, 3, 'VIJAY20', '20% OFF Discount', 'Flat 20% discount on your first order with Vijay Poultry.', '2024-01-01', '2026-12-31', 1, 1),
            (18, 3, 'FRESH50', 'Freshness First', 'Save ₹50 on orders above ₹500.', '2024-01-01', '2026-12-31', 5, 1)
        `);
        console.log("Offers seeded.");

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seed();
