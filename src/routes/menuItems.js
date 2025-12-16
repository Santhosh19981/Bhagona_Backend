const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

// ---------------------- IMAGE UPLOAD CONFIG ----------------------// Image upload config
// Use /tmp on Vercel (writable), ./uploads locally
const uploadDir = process.env.VERCEL ? "/tmp/uploads/menu_items/" : "./uploads/menu_items/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------------- GET ALL MENU ITEMS ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM menu_items ORDER BY menu_item_id DESC"
    );

    return res.json({
      status: "success",
      message: "Menu items fetched successfully",
      data: rows,
    });
  } catch (err) {
    console.error("❌ GET menu items error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ---------------------- CREATE MENU ITEM ----------------------
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, veg, nonveg } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Name & Price are required",
      });
    }

    const vegFlag = veg == 1 ? 1 : 0;
    const nonvegFlag = nonveg == 1 ? 1 : 0;

    const imageUrl = req.file
      ? `/uploads/menu_items/${req.file.filename}`
      : null;

    const sql = `
      INSERT INTO menu_items 
      (name, description, image_url, price, veg, nonveg, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await pool.query(sql, [
      name,
      description || null,
      imageUrl,
      price,
      vegFlag,
      nonvegFlag,
    ]);

    res.json({
      status: "success",
      message: "Menu item created successfully",
    });
  } catch (err) {
    console.error("❌ CREATE menu item error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ---------------------- UPDATE MENU ITEM ----------------------
router.put("/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, veg, nonveg, existingImage } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Name & Price are required",
      });
    }

    const vegFlag = veg == 1 ? 1 : 0;
    const nonvegFlag = nonveg == 1 ? 1 : 0;

    const imageUrl = req.file
      ? `/uploads/menu_items/${req.file.filename}`
      : existingImage || null;

    const sql = `
      UPDATE menu_items
      SET name = ?, description = ?, price = ?, veg = ?, nonveg = ?, image_url = ?, updated_at = NOW()
      WHERE menu_item_id = ?
    `;

    await pool.query(sql, [
      name,
      description || null,
      price,
      vegFlag,
      nonvegFlag,
      imageUrl,
      id,
    ]);

    res.json({
      status: "success",
      message: "Menu item updated successfully",
      menu_item_id: id,
    });
  } catch (err) {
    console.error("❌ UPDATE menu item error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ---------------------- DELETE MENU ITEM ----------------------
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM menu_items WHERE menu_item_id = ?", [id]);

    res.json({
      status: "success",
      message: "Menu item deleted successfully",
      deleted_id: id,
    });
  } catch (err) {
    console.error("❌ DELETE menu item error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ---------------------- FILTER MENU ITEMS ----------------------
router.get("/filter", async (req, res) => {
  try {
    const { type } = req.query;

    let sql = "SELECT * FROM menu_items";

    if (type === "veg") {
      sql += " WHERE veg = 1";
    } else if (type === "nonveg") {
      sql += " WHERE nonveg = 1";
    }

    const [rows] = await pool.query(sql);

    res.json({
      status: "success",
      data: rows,
    });
  } catch (err) {
    console.error("❌ FILTER menu items error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

module.exports = router;
