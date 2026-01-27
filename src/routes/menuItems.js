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
    const [rows] = await pool.query("SELECT image_url FROM menu_items WHERE menu_item_id = ?", [id]);

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


// ---------------------- GET ALL MENU ITEMS ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM menu_items ORDER BY menu_item_id DESC"
    );

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image_url
        ? (row.image_url.startsWith("data:") ? `/menu-items/image/${row.menu_item_id}` : row.image_url)
        : null
    }));

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
    });
  }
});

// ---------------------- CREATE MENU ITEM ----------------------
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, veg, nonveg, menu_category_id } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Name & Price are required",
      });
    }

    const vegFlag = veg == 1 ? 1 : 0;
    const nonvegFlag = nonveg == 1 ? 1 : 0;

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    const sql = `
      INSERT INTO menu_items 
      (name, description, image_url, price, veg, nonveg, menu_category_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await pool.query(sql, [
      name,
      description || null,
      imageUrl,
      price,
      vegFlag,
      nonvegFlag,
      menu_category_id || null,
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
    const { name, description, price, veg, nonveg, existingImage, menu_category_id } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        status: "error",
        message: "Name & Price are required",
      });
    }

    const vegFlag = veg == 1 ? 1 : 0;
    const nonvegFlag = nonveg == 1 ? 1 : 0;

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : existingImage || null;

    const sql = `
      UPDATE menu_items
      SET name = ?, description = ?, price = ?, veg = ?, nonveg = ?, image_url = ?, menu_category_id = ?, updated_at = NOW()
      WHERE menu_item_id = ?
    `;

    await pool.query(sql, [
      name,
      description || null,
      price,
      vegFlag,
      nonvegFlag,
      imageUrl,
      menu_category_id || null,
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
