const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const { cleanRequest } = require("../lib/validation");
const path = require("path");
const { serveImage, selectColumns, proxify, resolveExistingImage } = require("../lib/imageProxy");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });


// ---------------------- SERVE IMAGE FROM DB (PROXY) -------------------
router.get("/image/:id", serveImage({ table: "service_items", column: "image_url", idColumn: "service_item_id", label: "Service item image" }));


// ---------------------------------------------------------------
// 🔵 GET ALL SERVICE ITEMS (WITH SERVICE NAME)
// ---------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT ${await selectColumns("service_items", "si", ["image_url"])}, s.name AS service_name
      FROM service_items si
      LEFT JOIN services s ON si.service_id = s.service_id
    `;
    const queryParams = [];

    if (search) {
      sql += ` WHERE si.name LIKE ? OR s.name LIKE ? OR si.description LIKE ? `;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY si.service_item_id DESC `;

    const [rows] = await pool.query(sql, queryParams);

    const processedRows = proxify(rows, req, { field: "image_url", idField: "service_item_id", route: "/service-items" });

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
router.post("/create", upload.single("image"), cleanRequest, async (req, res) => {
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
router.put("/update/:id", upload.single("image"), cleanRequest, async (req, res) => {
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
      : (await resolveExistingImage(existingImage, { table: "service_items", column: "image_url", idColumn: "service_item_id", id })) || null;

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
