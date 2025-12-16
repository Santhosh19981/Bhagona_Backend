const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

// ---------------------- IMAGE UPLOAD CONFIG ----------------------// Image upload config
// Use /tmp on Vercel (writable), ./uploads locally
const uploadDir = process.env.VERCEL ? "/tmp/uploads/service_items/" : "./uploads/service_items/";
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


// ---------------------------------------------------------------
// 🔵 GET ALL SERVICE ITEMS (WITH SERVICE NAME)
// ---------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT si.*, s.name AS service_name
      FROM service_items si
      LEFT JOIN services s ON si.service_id = s.service_id
      ORDER BY si.service_item_id DESC
    `;

    const [rows] = await pool.query(sql);

    res.json({
      status: "success",
      message: "Service items fetched successfully",
      data: rows,
    });
  } catch (err) {
    console.error("❌ GET service items error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------------------------------------------------
// 🔵 CREATE SERVICE ITEM
// ---------------------------------------------------------------
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { service_id, name, description, quantity_type, price } = req.body;

    if (!service_id || !name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Service ID, Name & Price are required",
      });
    }

    const imageUrl = req.file
      ? `/uploads/service_items/${req.file.filename}`
      : null;

    const sql = `
      INSERT INTO service_items 
      (service_id, name, description, quantity_type, price, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await pool.query(sql, [
      service_id,
      name,
      description || null,
      quantity_type || null,
      price,
      imageUrl,
    ]);

    res.json({
      status: "success",
      message: "Service item created successfully",
    });
  } catch (err) {
    console.error("❌ CREATE service item error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------------------------------------------------
// 🔵 UPDATE SERVICE ITEM
// ---------------------------------------------------------------
router.put("/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_id,
      name,
      description,
      quantity_type,
      price,
      existingImage,
    } = req.body;

    if (!service_id || !name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Service ID, Name & Price are required",
      });
    }

    const imageUrl = req.file
      ? `/uploads/service_items/${req.file.filename}`
      : existingImage || null;

    const sql = `
      UPDATE service_items
      SET service_id = ?, name = ?, description = ?, quantity_type = ?, 
          price = ?, image_url = ?, updated_at = NOW()
      WHERE service_item_id = ?
    `;

    await pool.query(sql, [
      service_id,
      name,
      description || null,
      quantity_type || null,
      price,
      imageUrl,
      id,
    ]);

    res.json({
      status: "success",
      message: "Service item updated successfully",
      service_item_id: id,
    });
  } catch (err) {
    console.error("❌ UPDATE service item error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------------------------------------------------
// 🔵 DELETE SERVICE ITEM
// ---------------------------------------------------------------
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM service_items WHERE service_item_id = ?", [
      id,
    ]);

    res.json({
      status: "success",
      message: "Service item deleted successfully",
      deleted_id: id,
    });
  } catch (err) {
    console.error("❌ DELETE service item error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------------------------------------------------
// 🔵 FILTER BY SERVICE ID (optional feature)
// ---------------------------------------------------------------
router.get("/by-service/:service_id", async (req, res) => {
  try {
    const { service_id } = req.params;

    const sql = `
      SELECT si.*, s.name AS service_name
      FROM service_items si
      LEFT JOIN services s ON si.service_id = s.service_id
      WHERE si.service_id = ?
    `;

    const [rows] = await pool.query(sql, [service_id]);

    res.json({
      status: "success",
      data: rows,
    });
  } catch (err) {
    console.error("❌ FILTER service items error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

module.exports = router;
