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
// -------------------------------------------------------------
router.get("/vendors", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, email, mobile, businessname, address, \`describe\`, 
              image, rating, age, experience, cookingstyle, services, createdAt
       FROM Users 
       WHERE role = 3 AND isactive = 1 AND isapproved = 1`
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

module.exports = router;
