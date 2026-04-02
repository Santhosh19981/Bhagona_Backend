const pool = require('./src/db');

async function migrate() {
    try {
        console.log('--- Starting Vendor Data Migration ---');

        // 1. Update vendor_offers (18 -> 25)
        const [offerUpdate] = await pool.query('UPDATE vendor_offers SET vendor_id = 25 WHERE vendor_id = 18');
        console.log(`- Updated ${offerUpdate.affectedRows} offers from vendor 18 to 25.`);

        // 2. Add sample reviews for vendor 25 (using existing user ID 8)
        const reviews = [
            { rating: 5.0, comment: 'Exceptional quality! The poultry was fresh and the delivery was on time. Highly recommended for party orders.' },
            { rating: 4.8, comment: 'Vijay Poultry and Mutton is our go-to shop. Always hygienic and the best meat quality in this area.' },
            { rating: 4.5, comment: 'Great service and very professional. The wholesale prices are unbeatable. Will definitely order again.' }
        ];

        for (const review of reviews) {
            await pool.query(
                'INSERT INTO vendor_reviews (vendor_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)',
                [25, 8, review.rating, review.comment]
            );
        }
        console.log(`- Inserted ${reviews.length} sample reviews for vendor 25.`);

        console.log('--- Migration Successfully Completed ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
