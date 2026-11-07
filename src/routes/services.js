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
router.get("/image/:id", serveImage({ table: "services", column: "image_data", idColumn: "service_id", label: "Service image" }));


// ---------------------- GET ALL SERVICES ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${await selectColumns("services", "", ["image_data"])} FROM services ORDER BY service_id DESC`
    );

    const processedRows = proxify(rows, req, { field: "image_data", idField: "service_id", route: "/services" });

    return res.json({
      status: "success",
      message: "Services fetched successfully",
      data: processedRows,
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
router.post("/create", upload.single("image"), cleanRequest, async (req, res) => {
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

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

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
router.put("/update/:id", upload.single("image"), cleanRequest, async (req, res) => {
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
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : (await resolveExistingImage(existingImage, { table: "services", column: "image_data", idColumn: "service_id", id })) || null;

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
