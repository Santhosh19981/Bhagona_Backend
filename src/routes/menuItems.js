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
router.get("/image/:id", serveImage({ table: "menu_items", column: "image_url", idColumn: "menu_item_id", label: "Image" }));


// ---------------------- GET ALL MENU ITEMS ----------------------
router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT ${await selectColumns("menu_items", "mi", ["image_url"])}, mc.name as category_name, ms.name as subcategory_name
      FROM menu_items mi
      LEFT JOIN menu_category mc ON mi.menu_category_id = mc.id
      LEFT JOIN menu_subcategory ms ON mi.menu_subcategory_id = ms.id
      ORDER BY mi.menu_item_id DESC
    `;
    const [rows] = await pool.query(sql);

    const processedRows = proxify(rows, req, { field: "image_url", idField: "menu_item_id", route: "/menu-items" });

    return res.json({
      status: "success",
      message: "Menu items fetched successfully",
      data: processedRows,
    });
  } catch (err) {
    console.error("❌ GET menu items error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      details: err.message
    });
  }
});

// ---------------------- GET MENU ITEM BY ID ----------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT ${await selectColumns("menu_items", "mi", ["image_url"])}, mc.name as category_name, ms.name as subcategory_name
      FROM menu_items mi
      LEFT JOIN menu_category mc ON mi.menu_category_id = mc.id
      LEFT JOIN menu_subcategory ms ON mi.menu_subcategory_id = ms.id
      WHERE mi.menu_item_id = ?
    `;
    const [rows] = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Menu item not found" });
    }

    const processedItem = proxify(rows[0], req, { field: "image_url", idField: "menu_item_id", route: "/menu-items" });

    return res.json({
      status: "success",
      message: "Menu item fetched successfully",
      data: processedItem,
    });
  } catch (err) {
    console.error("❌ GET menu item by id error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      details: err.message
    });
  }
});

// ---------------------- CREATE MENU ITEM ----------------------
router.post("/create", upload.single("image"), cleanRequest, async (req, res) => {
  try {
    const { name, description, price, menu_category_id, menu_subcategory_id, status } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Name & Price are required",
      });
    }

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    const sql = `
      INSERT INTO menu_items 
      (name, description, image_url, price, menu_category_id, menu_subcategory_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await pool.query(sql, [
      name,
      description || null,
      imageUrl,
      price,
      menu_category_id || null,
      menu_subcategory_id || null,
      status || 'active',
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
      details: err.message
    });
  }
});

// ---------------------- UPDATE MENU ITEM ----------------------
router.put("/update/:id", upload.single("image"), cleanRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, existingImage, menu_category_id, menu_subcategory_id, status } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Name & Price are required",
      });
    }

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : (await resolveExistingImage(existingImage, { table: "menu_items", column: "image_url", idColumn: "menu_item_id", id })) || null;

    const sql = `
      UPDATE menu_items
      SET name = ?, description = ?, price = ?, image_url = ?, menu_category_id = ?, menu_subcategory_id = ?, status = ?, updated_at = NOW()
      WHERE menu_item_id = ?
    `;

    await pool.query(sql, [
      name,
      description || null,
      price,
      imageUrl,
      menu_category_id || null,
      menu_subcategory_id || null,
      status || 'active',
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
      details: err.message
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
      details: err.message
    });
  }
});

// ---------------------- FILTER MENU ITEMS ----------------------
router.get("/filter", async (req, res) => {
  try {
    const { type } = req.query;

    let sql = `
      SELECT mi.*, mc.name as category_name, ms.name as subcategory_name
      FROM menu_items mi
      LEFT JOIN menu_category mc ON mi.menu_category_id = mc.id
      LEFT JOIN menu_subcategory ms ON mi.menu_subcategory_id = ms.id
      ORDER BY mi.menu_item_id DESC
    `;
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
      details: err.message
    });
  }
});

module.exports = router;
