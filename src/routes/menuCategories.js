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
router.get("/image/:id", serveImage({ table: "menu_category", column: "image", idColumn: "id", label: "Category image" }));

// ---------------------- GET ALL CATEGORIES ----------------------
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT ${await selectColumns("menu_category", "", ["image"])} FROM menu_category ORDER BY id DESC`);

        const processedRows = proxify(rows, req, { field: "image", idField: "id", route: "/menu-categories" });

        res.json({
            status: "success",
            message: "Menu categories fetched successfully",
            data: processedRows,
        });
    } catch (err) {
        console.error("❌ GET menu categories error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ---------------------- CREATE CATEGORY ----------------------
router.post("/create", upload.single("image"), cleanRequest, async (req, res) => {
    try {
        const { name, status } = req.body;

        if (!name) {
            return res.status(400).json({ status: "error", message: "Name is required" });
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : null;

        const sql = "INSERT INTO menu_category (name, status, image) VALUES (?, ?, ?)";
        await pool.query(sql, [name, status || "active", imageUrl]);

        res.json({ status: "success", message: "Menu category created successfully" });
    } catch (err) {
        console.error("❌ CREATE menu category error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ---------------------- UPDATE CATEGORY ----------------------
router.put("/update/:id", upload.single("image"), cleanRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, existingImage } = req.body;

        if (!name) {
            return res.status(400).json({ status: "error", message: "Name is required" });
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : (await resolveExistingImage(existingImage, { table: "menu_category", column: "image", idColumn: "id", id })) || null;

        const sql = "UPDATE menu_category SET name = ?, status = ?, image = ? WHERE id = ?";
        await pool.query(sql, [name, status || "active", imageUrl, id]);

        res.json({ status: "success", message: "Menu category updated successfully" });
    } catch (err) {
        console.error("❌ UPDATE menu category error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ---------------------- DELETE CATEGORY ----------------------
router.delete("/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM menu_category WHERE id = ?", [id]);
        res.json({ status: "success", message: "Menu category deleted successfully" });
    } catch (err) {
        console.error("❌ DELETE menu category error:", err);
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

module.exports = router;
