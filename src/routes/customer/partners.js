const express = require("express");
const router = express.Router();
const db = require("../../db");

// -------------------------------------------------------------
// GET PUBLIC CHEFS (role = 2, active & approved)
// -------------------------------------------------------------
router.get("/chefs", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, email, mobile, experience, cookingstyle, services,
              address, \`describe\`, image, rating, age, businessname, createdAt
       FROM Users 
       WHERE role = 2 AND isactive = 1 AND isapproved = 1`
        );

        const processedRows = rows.map(row => ({
            ...row,
            display_url: row.image
                ? (row.image.startsWith("data:") ? `/profiles/image/${row.id}` : row.image)
                : null
        }));

        return res.json({ status: true, data: processedRows });
    } catch (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ status: false, message: "Database error" });
    }
});

// -------------------------------------------------------------
// GET PUBLIC VENDORS (role = 3, active & approved)
// Optional: Filter by service_id
// -------------------------------------------------------------
router.get("/vendors", async (req, res) => {
    try {
        const { service_id } = req.query;
        let sql = `
            SELECT id, name, email, mobile, businessname, address, \`describe\`, 
                   image, rating, age, experience, cookingstyle, services, createdAt
            FROM Users 
        `;
        let params = [];

        console.log(`🔍 Received request for vendors. service_id:`, service_id);

        if (service_id) {
            const cleanSid = service_id.toString().trim();
            console.log(`🔍 Cleaned service_id: [${cleanSid}]`);

            // Using a broader match and supporting multiple formats
            // Checking both the mapping table and the legacy column
            sql = `
                SELECT u.id, u.name, u.email, u.mobile, u.businessname, u.address, u.\`describe\`, 
                       u.image, u.rating, u.age, u.experience, u.cookingstyle, u.services, u.createdAt
                FROM Users u
                LEFT JOIN vendor_service_mappings vsm ON u.id = vsm.vendor_id
                WHERE u.role = 3 AND u.isactive = 1 AND u.isapproved = 1 
                  AND (
                    vsm.service_id = ? 
                    OR FIND_IN_SET(?, REPLACE(u.services, ' ', ''))
                    OR u.services = ?
                    OR u.services LIKE CONCAT('%,', ?, ',%')
                    OR u.services LIKE CONCAT(?, ',%')
                    OR u.services LIKE CONCAT('%,', ?)
                  )
                GROUP BY u.id
            `;
            params.push(cleanSid, cleanSid, cleanSid, cleanSid, cleanSid, cleanSid);
        } else {
            sql += `
                WHERE role = 3 AND isactive = 1 AND isapproved = 1
            `;
        }

        console.log('🚀 Executing SQL:', sql);
        console.log('📦 Params:', params);

        const [rows] = await db.query(sql, params);
        console.log(`✅ Found ${rows.length} vendors`);

        const processedRows = rows.map(row => ({
            ...row,
            display_url: row.image
                ? (row.image.startsWith("data:") ? `/profiles/image/${row.id}` : row.image)
                : null
        }));

        return res.json({ status: true, data: processedRows });
    } catch (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ status: false, message: "Database error" });
    }
});


module.exports = router;
