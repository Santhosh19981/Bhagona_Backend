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


// ---------------------- SERVE IMAGE FROM DB -------------------
// This allows you to have a real URL that works on Vercel
router.get("/image/:id", serveImage({ table: "events", column: "image_url", idColumn: "event_id", label: "Image" }));


// ---------------------- GET ALL EVENTS ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT ${await selectColumns("events", "", ["image_url"])} FROM events ORDER BY event_id DESC`);

    // image_url / display_url are versioned proxy URLs (or the raw URL if already a link)
    const processedRows = proxify(rows, req, { field: "image_url", idField: "event_id", route: "/events" });

    return res.json({
      status: "success",
      message: "Events fetched successfully",
      data: processedRows
    });

  } catch (err) {
    console.error("❌ GET events error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------- CREATE EVENT ----------------------
router.post("/create", upload.single("image"), cleanRequest, async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !description || !status) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required"
      });
    }

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    const sql = `
      INSERT INTO events (name, description, image_url, status)
      VALUES (?, ?, ?, ?)
    `;

    await pool.query(sql, [name, description, imageUrl, status]);

    res.json({
      status: "success",
      message: "Event created successfully"
    });

  } catch (err) {
    console.error("❌ CREATE event error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------- UPDATE EVENT ----------------------
router.put("/update/:id", upload.single("image"), cleanRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, existingImage } = req.body;

    if (!name || !description || !status) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : (await resolveExistingImage(existingImage, { table: "events", column: "image_url", idColumn: "event_id", id })) || null;

    const sql = `
      UPDATE events 
      SET name = ?, description = ?, image_url = ?, status = ?, updated_at = NOW()
      WHERE event_id = ?
    `;

    await pool.query(sql, [name, description, imageUrl, status, id]);

    res.json({
      status: "success",
      message: "Event updated successfully",
      event_id: id
    });

  } catch (err) {
    console.error("❌ UPDATE event error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});


// ---------------------- DELETE EVENT ----------------------
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const sql = "DELETE FROM events WHERE event_id = ?";
    await pool.query(sql, [id]);

    res.json({
      status: "success",
      message: "Event deleted successfully",
      deleted_id: id
    });

  } catch (err) {
    console.error("❌ DELETE event error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

module.exports = router;
