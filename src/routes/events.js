const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });


// ---------------------- SERVE IMAGE FROM DB -------------------
// This allows you to have a real URL that works on Vercel
router.get("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT image_url FROM events WHERE event_id = ?", [id]);

    if (rows.length === 0 || !rows[0].image_url || !rows[0].image_url.startsWith("data:")) {
      return res.status(404).send("Image not found");
    }

    const base64Data = rows[0].image_url;
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      return res.status(400).send("Invalid image data");
    }

    const response = {
      type: matches[1],
      data: Buffer.from(matches[2], "base64")
    };

    res.set("Content-Type", response.type);
    res.send(response.data);

  } catch (err) {
    console.error("❌ Image serve error:", err);
    res.status(500).send("Error serving image");
  }
});


// ---------------------- GET ALL EVENTS ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM events ORDER BY event_id DESC");

    // Use display_url for proxy, or raw URL if it's already a full link
    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image_url
        ? (row.image_url.startsWith("data:") ? `/events/image/${row.event_id}` : row.image_url)
        : null
    }));

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
router.post("/create", upload.single("image"), async (req, res) => {
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
router.put("/update/:id", upload.single("image"), async (req, res) => {
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
      : existingImage;

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
