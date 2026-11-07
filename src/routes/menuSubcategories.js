const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const { cleanRequest } = require("../lib/validation");
const { serveImage, selectColumns, proxify, resolveExistingImage } = require("../lib/imageProxy");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------- SERVE IMAGE FROM DB (PROXY) -------------------
router.get("/image/:id", serveImage({ table: "menu_subcategory", column: "image", idColumn: "id", label: "Subcategory image" }));

// ---------------------- GET ALL SUBCATEGORIES ----------------------
router.get("/", async (req, res) => {
    try {
        const [subcategories] = await pool.query(`SELECT ${await selectColumns("menu_subcategory", "", ["image"])} FROM menu_subcategory ORDER BY id DESC`);
        proxify(subcategories, req, { field: "image", idField: "id", route: "/menu-subcategories", displayField: null });

        const [mappings] = await pool.query(`
            SELECT m.subcategory_id, m.category_id, c.name as category_name 
            FROM menu_category_subcategory_mapping m
            JOIN menu_category c ON m.category_id = c.id
        `);

        // Group mappings once (O(n)) instead of filtering per subcategory
        const bySub = new Map();
        for (const m of mappings) {
            if (!bySub.has(m.subcategory_id)) bySub.set(m.subcategory_id, []);
            bySub.get(m.subcategory_id).push({ id: m.category_id, name: m.category_name });
        }

        const result = subcategories.map(s => ({
            ...s,
            categories: bySub.get(s.id) || [],
            display_url: s.image || null
        }));

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
            SELECT ${await selectColumns("menu_subcategory", "s", ["image"])}
            FROM menu_subcategory s
            JOIN menu_category_subcategory_mapping m ON s.id = m.subcategory_id
            WHERE m.category_id = ?
            ORDER BY s.name ASC
        `;
        const [rows] = await pool.query(sql, [categoryId]);

        const processedRows = proxify(rows, req, { field: "image", idField: "id", route: "/menu-subcategories" });

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
router.post("/create", upload.single("image"), cleanRequest, async (req, res) => {
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
router.put("/update/:id", upload.single("image"), cleanRequest, async (req, res) => {
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
            : (await resolveExistingImage(existingImage, { table: "menu_subcategory", column: "image", idColumn: "id", id })) || null;

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
