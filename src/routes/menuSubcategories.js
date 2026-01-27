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
        const sql = `
            SELECT s.*, c.name as category_name 
            FROM menu_subcategory s
            JOIN menu_category c ON s.menu_category_id = c.id
            ORDER BY s.id DESC
        `;
        const [rows] = await pool.query(sql);

        const processedRows = rows.map(row => ({
            ...row,
            display_url: row.image
                ? (row.image.startsWith("data:") ? `/menu-subcategories/image/${row.id}` : row.image)
                : null
        }));

        res.json({
            status: "success",
            message: "Menu subcategories fetched successfully",
            data: processedRows,
        });
    } catch (err) {
        console.error("❌ GET menu subcategories error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ---------------------- GET SUBCATEGORIES BY CATEGORY ----------------------
router.get("/category/:categoryId", async (req, res) => {
    try {
        const { categoryId } = req.params;
        const [rows] = await pool.query("SELECT * FROM menu_subcategory WHERE menu_category_id = ? ORDER BY name ASC", [categoryId]);

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
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ---------------------- CREATE SUBCATEGORY ----------------------
router.post("/create", upload.single("image"), async (req, res) => {
    try {
        const { name, status, menu_category_id } = req.body;

        if (!name || !menu_category_id) {
            return res.status(400).json({ status: "error", message: "Name and Category ID are required" });
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : null;

        const sql = "INSERT INTO menu_subcategory (name, menu_category_id, status, image) VALUES (?, ?, ?, ?)";
        await pool.query(sql, [name, menu_category_id, status || "active", imageUrl]);

        res.json({ status: "success", message: "Menu subcategory created successfully" });
    } catch (err) {
        console.error("❌ CREATE menu subcategory error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ---------------------- UPDATE SUBCATEGORY ----------------------
router.put("/update/:id", upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, menu_category_id, existingImage } = req.body;

        if (!name || !menu_category_id) {
            return res.status(400).json({ status: "error", message: "Name and Category ID are required" });
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : existingImage || null;

        const sql = "UPDATE menu_subcategory SET name = ?, menu_category_id = ?, status = ?, image = ? WHERE id = ?";
        await pool.query(sql, [name, menu_category_id, status || "active", imageUrl, id]);

        res.json({ status: "success", message: "Menu subcategory updated successfully" });
    } catch (err) {
        console.error("❌ UPDATE menu subcategory error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
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
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

module.exports = router;
