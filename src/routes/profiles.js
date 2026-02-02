const express = require("express");
const router = express.Router();
const db = require("../db"); // mysql2/promise
const multer = require("multer");
const path = require("path");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// -------------------------------------------------------------
// SERVE USER IMAGE FROM DB
// -------------------------------------------------------------
router.get("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT image FROM Users WHERE id = ?", [id]);

    if (rows.length === 0 || !rows[0].image || !rows[0].image.startsWith("data:")) {
      return res.status(404).send("Image not found");
    }

    const base64Data = rows[0].image;
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

// -------------------------------------------------------------
// GET SINGLE USER BY ID
// -------------------------------------------------------------
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT id, name, email, mobile, role, isactive, isapproved, address, age, experience, cookingstyle, services, \`describe\`, businessname, image, createdAt FROM Users WHERE id = ?",
      [id]
    );

    const user = rows[0];
    const display_url = user.image
      ? (user.image.startsWith("data:") ? `/profiles/image/${user.id}` : user.image)
      : null;

    return res.json({ status: true, data: { ...user, display_url } });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

// -------------------------------------------------------------
// GET ALL CUSTOMERS (role = 1)
// -------------------------------------------------------------
router.get("/customers", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, mobile, isactive, isapproved, address, image, createdAt
       FROM Users WHERE role = 1`
    );

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image
        ? (row.image.startsWith("data:") ? `/profiles/image/${row.id}` : row.image)
        : null
    }));

    return res.json({ status: true, data: processedRows });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

// -------------------------------------------------------------
// GET ALL CHEFS (role = 2)
// -------------------------------------------------------------
router.get("/chefs", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, mobile, experience, cookingstyle, services,
              isactive, isapproved, address, \`describe\`, image
       FROM Users WHERE role = 2`
    );

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image
        ? (row.image.startsWith("data:") ? `/profiles/image/${row.id}` : row.image)
        : null
    }));

    return res.json({ status: true, data: processedRows });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

// -------------------------------------------------------------
// GET ALL VENDORS (role = 3)
// -------------------------------------------------------------
router.get("/vendors", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, mobile, businessname, isactive, isapproved,
              address, \`describe\`, image
       FROM Users WHERE role = 3`
    );

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image
        ? (row.image.startsWith("data:") ? `/profiles/image/${row.id}` : row.image)
        : null
    }));

    return res.json({ status: true, data: processedRows });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

// -------------------------------------------------------------
// UPDATE isactive STATUS (Activate/Deactivate User)
// -------------------------------------------------------------
router.put("/status/:id", async (req, res) => {
  const { id } = req.params;
  const { isactive } = req.body;

  if (isactive === undefined) {
    return res
      .status(400)
      .json({ status: false, message: "Missing isactive value" });
  }

  try {
    await db.query(`UPDATE Users SET isactive = ? WHERE id = ?`, [
      isactive,
      id,
    ]);

    return res.json({
      status: true,
      message: "User active status updated successfully",
    });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

// -------------------------------------------------------------
// UPDATE USER PROFILE (Full Update)
// -------------------------------------------------------------
router.put("/user/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    mobile,
    address,
    age,
    experience,
    cookingstyle,
    services,
    describe,
    businessname,
    existingImage
  } = req.body;

  try {
    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : existingImage;

    const sql = `
      UPDATE Users 
      SET name = ?, email = ?, mobile = ?, address = ?, age = ?, 
          experience = ?, cookingstyle = ?, services = ?, \`describe\` = ?, 
          businessname = ?, image = ?, updatedAt = NOW()
      WHERE id = ?
    `;

    const values = [
      name, email, mobile, address, age || null,
      experience || null,
      Array.isArray(cookingstyle) ? cookingstyle.join(', ') : cookingstyle || '',
      Array.isArray(services) ? services.join(', ') : services || '',
      describe || '',
      businessname || '',
      imageUrl,
      id
    ];

    await db.query(sql, values);

    return res.json({
      status: true,
      message: "User profile updated successfully",
    });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

// -------------------------------------------------------------
// DELETE USER
// -------------------------------------------------------------
router.delete("/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM Users WHERE id = ?", [id]);
    return res.json({ status: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

module.exports = router;
