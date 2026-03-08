const pool = require('./src/db');
async function run() {
    try {
        const [rows] = await pool.query('SELECT id, name, role, isactive, isapproved, services FROM Users WHERE role = 3');
        console.log('Vendors (role 3):', JSON.stringify(rows, null, 2));

        const [mappings] = await pool.query("SHOW TABLES LIKE 'vendor_service_mappings'");
        console.log('vendor_service_mappings table exists:', mappings.length > 0);

        if (mappings.length > 0) {
            const [mappingRows] = await pool.query('SELECT * FROM vendor_service_mappings');
            console.log('Mappings:', JSON.stringify(mappingRows, null, 2));
        }

        const serviceId = 3;
        const [joinRows] = await pool.query(`
      SELECT u.id, u.name, u.isactive, u.isapproved, vsm.service_id
      FROM Users u
      INNER JOIN vendor_service_mappings vsm ON u.id = vsm.vendor_id
      WHERE u.role = 3 AND vsm.service_id = ?
    `, [serviceId]);
        console.log(`Join for service ${serviceId}:`, JSON.stringify(joinRows, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}
run();
