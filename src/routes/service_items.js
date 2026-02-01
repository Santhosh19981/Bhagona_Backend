const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });


// ---------------------- SERVE IMAGE FROM DB (PROXY) -------------------
router.get("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT image_url FROM service_items WHERE service_item_id = ?", [id]);

    if (rows.length === 0 || !rows[0].image_url || !rows[0].image_url.startsWith("data:")) {
      return res.status(404).send("Image not found");
    }

    const base64Data = rows[0].image_url;
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      return res.status(400).send("Invalid image data");
    }

    res.set("Content-Type", matches[1]);
    res.send(Buffer.from(matches[2], "base64"));

  } catch (err) {
    console.error("❌ Image serve error:", err);
    res.status(500).send("Error serving image");
  }
});


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

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image_url
        ? (row.image_url.startsWith("data:") ? `/service-items/image/${row.service_item_id}` : row.image_url)
        : null
    }));

    res.json({
      status: "success",
      message: "Service items fetched successfully",
      data: processedRows,
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
    const { service_id, name, description, quantity_type, price, status } = req.body;

    if (!service_id || !name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Service ID, Name & Price are required",
      });
    }

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    const sql = `
      INSERT INTO service_items 
      (service_id, name, description, quantity_type, price, image_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await pool.query(sql, [
      service_id,
      name,
      description || null,
      quantity_type || null,
      price,
      imageUrl,
      status || 'active',
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
      status,
    } = req.body;

    if (!service_id || !name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Service ID, Name & Price are required",
      });
    }

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : existingImage || null;

    const sql = `
      UPDATE service_items
      SET service_id = ?, name = ?, description = ?, quantity_type = ?, 
          price = ?, image_url = ?, status = ?, updated_at = NOW()
      WHERE service_item_id = ?
    `;

    await pool.query(sql, [
      service_id,
      name,
      description || null,
      quantity_type || null,
      price,
      imageUrl,
      status || 'active',
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
