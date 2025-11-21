const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");

// Image upload config
const storage = multer.diskStorage({
  destination: "./uploads/events/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });


// ---------------------- GET ALL EVENTS ----------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM events ORDER BY event_id DESC");

    return res.json({
      status: "success",
      message: "Events fetched successfully",
      data: rows
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

    const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : null;

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
      ? `/uploads/events/${req.file.filename}`
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
