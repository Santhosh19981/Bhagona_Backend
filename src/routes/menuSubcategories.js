const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------- SERVE IMAGE FROM DB (PROXY) -------------------
router.get("/image/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query("SELECT image FROM menu_subcategory WHERE id = ?", [id]);

        if (rows.length === 0 || !rows[0].image || !rows[0].image.startsWith("data:")) {
            return res.status(404).send("Image not found");
        }

        const base64Data = rows[0].image;
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            return res.status(400).send("Invalid image data");
        }

        res.set("Content-Type", matches[1]);
        res.send(Buffer.from(matches[2], "base64"));

    } catch (err) {
        console.error("❌ Subcategory image serve error:", err);
        res.status(500).send("Error serving image");
    }
});

// ---------------------- GET ALL SUBCATEGORIES ----------------------
router.get("/", async (req, res) => {
    try {
        const [subcategories] = await pool.query("SELECT * FROM menu_subcategory ORDER BY id DESC");

        const [mappings] = await pool.query(`
            SELECT m.subcategory_id, m.category_id, c.name as category_name 
            FROM menu_category_subcategory_mapping m
            JOIN menu_category c ON m.category_id = c.id
        `);

        const result = subcategories.map(s => {
            const categories = mappings
                .filter(m => m.subcategory_id === s.id)
                .map(m => ({ id: m.category_id, name: m.category_name }));

            return {
                ...s,
                categories,
                display_url: s.image
                    ? (s.image.startsWith("data:") ? `/menu-subcategories/image/${s.id}` : s.image)
                    : null
            };
        });

        res.json({
            status: "success",
            message: "Menu subcategories fetched successfully",
            data: result,
        });
    } catch (err) {
        console.error("❌ GET menu subcategories error:", err);
        res.status(500).json({ status: "error", message: "Server error", details: err.message });
    }
});

// ---------------------- GET SUBCATEGORIES BY CATEGORY ----------------------
router.get("/category/:categoryId", async (req, res) => {
    try {
        const { categoryId } = req.params;
        const sql = `
            SELECT s.* 
            FROM menu_subcategory s
            JOIN menu_category_subcategory_mapping m ON s.id = m.subcategory_id
            WHERE m.category_id = ?
            ORDER BY s.name ASC
        `;
        const [rows] = await pool.query(sql, [categoryId]);

        const processedRows = rows.map(row => ({
            ...row,
            display_url: row.image
                ? (row.image.startsWith("data:") ? `/menu-subcategories/image/${row.id}` : row.image)
                : null
        }));

        res.json({
            status: "success",
            message: "Subcategories for category fetched successfully",
            data: processedRows,
        });
    } catch (err) {
        console.error("❌ GET subcategories by category error:", err);
        res.status(500).json({ status: "error", message: "Server error", details: err.message });
    }
});

// ---------------------- CREATE SUBCATEGORY ----------------------
router.post("/create", upload.single("image"), async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        let { name, status, category_ids } = req.body;

        if (!name || !category_ids) {
            return res.status(400).json({ status: "error", message: "Name and Category IDs are required" });
        }

        // Handle category_ids if it comes as a string (from FormData)
        if (typeof category_ids === 'string') {
            try {
                category_ids = JSON.parse(category_ids);
            } catch (e) {
                category_ids = category_ids.split(',').map(id => id.trim());
            }
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : null;

        const [subResult] = await connection.query(
            "INSERT INTO menu_subcategory (name, status, image) VALUES (?, ?, ?)",
            [name, status || "active", imageUrl]
        );
        const subcategoryId = subResult.insertId;

        for (const catId of category_ids) {
            await connection.query(
                "INSERT INTO menu_category_subcategory_mapping (category_id, subcategory_id) VALUES (?, ?)",
                [catId, subcategoryId]
            );
        }

        await connection.commit();
        res.json({ status: "success", message: "Menu subcategory created successfully", id: subcategoryId });
    } catch (err) {
        await connection.rollback();
        console.error("❌ CREATE menu subcategory error:", err);
        res.status(500).json({ status: "error", message: "Server error", details: err.message });
    } finally {
        connection.release();
    }
});

// ---------------------- UPDATE SUBCATEGORY ----------------------
router.put("/update/:id", upload.single("image"), async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params;
        let { name, status, category_ids, existingImage } = req.body;

        if (!name || !category_ids) {
            return res.status(400).json({ status: "error", message: "Name and Category IDs are required" });
        }

        if (typeof category_ids === 'string') {
            try {
                category_ids = JSON.parse(category_ids);
            } catch (e) {
                category_ids = category_ids.split(',').map(id => id.trim());
            }
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : existingImage || null;

        await connection.query(
            "UPDATE menu_subcategory SET name = ?, status = ?, image = ? WHERE id = ?",
            [name, status || "active", imageUrl, id]
        );

        await connection.query("DELETE FROM menu_category_subcategory_mapping WHERE subcategory_id = ?", [id]);

        for (const catId of category_ids) {
            await connection.query(
                "INSERT INTO menu_category_subcategory_mapping (category_id, subcategory_id) VALUES (?, ?)",
                [catId, id]
            );
        }

        await connection.commit();
        res.json({ status: "success", message: "Menu subcategory updated successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("❌ UPDATE menu subcategory error:", err);
        res.status(500).json({ status: "error", message: "Server error", details: err.message });
    } finally {
        connection.release();
    }
});

// ---------------------- DELETE SUBCATEGORY ----------------------
router.delete("/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM menu_subcategory WHERE id = ?", [id]);
        res.json({ status: "success", message: "Menu subcategory deleted successfully" });
    } catch (err) {
        console.error("❌ DELETE menu subcategory error:", err);
        res.status(500).json({ status: "error", message: "Server error", details: err.message });
    }
});

module.exports = router;
