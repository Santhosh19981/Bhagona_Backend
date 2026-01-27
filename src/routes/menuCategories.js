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
        const [rows] = await pool.query("SELECT image FROM menu_category WHERE id = ?", [id]);

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
        console.error("❌ Category image serve error:", err);
        res.status(500).send("Error serving image");
    }
});

// ---------------------- GET ALL CATEGORIES ----------------------
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM menu_category ORDER BY id DESC");

        const processedRows = rows.map(row => ({
            ...row,
            display_url: row.image
                ? (row.image.startsWith("data:") ? `/menu-categories/image/${row.id}` : row.image)
                : null
        }));

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
router.post("/create", upload.single("image"), async (req, res) => {
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
router.put("/update/:id", upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, existingImage } = req.body;

        if (!name) {
            return res.status(400).json({ status: "error", message: "Name is required" });
        }

        const imageUrl = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : existingImage || null;

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
