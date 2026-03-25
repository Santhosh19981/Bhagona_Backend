const pool = require('./src/db');

async function check() {
    try {
        const [services] = await pool.query("SELECT * FROM services WHERE name LIKE '%Poultry%' OR name LIKE '%Mutton%'");
        console.log('Services:', services);
        
        const [users] = await pool.query("SELECT * FROM Users WHERE name LIKE '%Vijay%'");
        console.log('Users:', users);
        
        if (users.length > 0) {
            const userId = users[0].id || users[0].user_id;
            const [profiles] = await pool.query("SELECT * FROM vendor_profiles WHERE user_id = ?", [userId]);
            console.log('Vendor Profiles:', profiles);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
