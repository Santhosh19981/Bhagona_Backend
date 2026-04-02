const db = require('./src/db');

async function test() {
    try {
        const service_id = '3';
        const cleanSid = service_id.toString().trim();
        const sql = `
                SELECT u.user_id, u.name, u.email, u.mobile, u.businessname, u.address, u.\`describe\`, 
                       u.image, u.rating, u.age, u.experience, u.cookingstyle, u.services, u.createdAt
                FROM Users u
                LEFT JOIN vendor_service_mappings vsm ON u.user_id = vsm.vendor_id
                WHERE u.role = 3 AND u.isactive = 1 AND u.isapproved = 1 
                  AND (
                    vsm.service_id = ? 
                    OR FIND_IN_SET(?, REPLACE(u.services, ' ', ''))
                    OR u.services = ?
                    OR u.services LIKE CONCAT('%,', ?, ',%')
                    OR u.services LIKE CONCAT(?, ',%')
                    OR u.services LIKE CONCAT('%,', ?)
                  )
                GROUP BY u.user_id
            `;
        const params = [cleanSid, cleanSid, cleanSid, cleanSid, cleanSid, cleanSid];
        const [rows] = await db.query(sql, params);
        console.log('Results:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

test();
