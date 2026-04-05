const pool = require('./src/db');
require('dotenv').config();

async function addDemoUser() {
    try {
        console.log('🔄 Checking if demo user 9658626856 exists...');
        const [existing] = await pool.query('SELECT * FROM Users WHERE mobile = ?', ['9658626856']);
        
        if (existing.length > 0) {
            console.log('✅ Demo user already exists.');
        } else {
            console.log('⏳ Adding demo user 9658626856 as Customer...');
            await pool.query(
                `INSERT INTO Users (name, mobile, email, password, role, isactive, isapproved) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['Demo Customer', '9658626856', 'demo@bhagona.com', '1234', 4, 1, 1]
            );
            console.log('✅ Demo user added successfully!');
        }
    } catch (err) {
        console.error('❌ Error adding demo user:', err.message);
    } finally {
        process.exit();
    }
}
addDemoUser();
