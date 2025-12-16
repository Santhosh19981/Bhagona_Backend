const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

// ---------------------- IMAGE UPLOAD CONFIG ----------------------// Image upload config
// Use /tmp on Vercel (writable), ./uploads locally   
const uploadDir = process.env.VERCEL ? "/tmp/uploads/services/" : "./uploads/services/";
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


// ---------------------- GET ALL SERVICES ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM services ORDER BY service_id DESC"
    );

    return res.json({
      status: "success",
      message: "Services fetched successfully",
      data: rows,
    });

  } catch (err) {
    console.error("❌ GET services error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------- CREATE SERVICE ----------------------
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, description, status, unit_id } = req.body;

    if (!name || !status) {
      return res.status(400).json({
        status: "error",
        message: "Name & Status are required",
      });
    }

    // 🟢 Convert unit_id to NULL if empty
    const finalUnitId =
      unit_id === "" || unit_id === "null" || unit_id === undefined
        ? null
        : unit_id;

    const imageUrl = req.file ? `/uploads/services/${req.file.filename}` : null;

    const sql = `
      INSERT INTO services (name, description, status, unit_id, image_data)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      name,
      description,
      status,
      finalUnitId,
      imageUrl,
    ]);

    res.json({
      status: "success",
      message: "Service created successfully",
    });

  } catch (err) {
    console.error("❌ CREATE service error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});



// ---------------------- UPDATE SERVICE ----------------------
router.put("/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, status, unit_id, existingImage } = req.body;

    if (!name || !status) {
      return res.status(400).json({
        status: "error",
        message: "Name & Status are required",
      });
    }

    // 🟢 Fix unit_id values
    const finalUnitId =
      unit_id === "" || unit_id === "null" || unit_id === undefined
        ? null
        : unit_id;

    // 🟢 Determine final image
    const finalImage = req.file
      ? `/uploads/services/${req.file.filename}`
      : existingImage || null;

    const sql = `
      UPDATE services 
      SET name = ?, description = ?, status = ?, unit_id = ?, image_data = ?, updated_at = NOW()
      WHERE service_id = ?
    `;

    await pool.query(sql, [
      name,
      description,
      status,
      finalUnitId,
      finalImage,
      id,
    ]);

    res.json({
      status: "success",
      message: "Service updated successfully",
      service_id: id,
    });

  } catch (err) {
    console.error("❌ UPDATE service error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});



// ---------------------- DELETE SERVICE ----------------------
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM services WHERE service_id = ?", [id]);

    res.json({
      status: "success",
      message: "Service deleted successfully",
      deleted_id: id,
    });

  } catch (err) {
    console.error("❌ DELETE service error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});



module.exports = router;
