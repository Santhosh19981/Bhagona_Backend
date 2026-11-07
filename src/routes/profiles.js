const express = require("express");
const router = express.Router();
const db = require("../db"); // mysql2/promise
const multer = require("multer");
const { cleanRequest } = require("../lib/validation");
const path = require("path");
const { serveImage, blobSafe, proxify, resolveExistingImage } = require("../lib/imageProxy");

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// -------------------------------------------------------------
// SERVE USER IMAGE FROM DB
// -------------------------------------------------------------
router.get("/image/:id", serveImage({ table: "Users", column: "image", idColumn: "user_id", label: "Image" }));

// -------------------------------------------------------------
// GET SINGLE USER BY ID
// -------------------------------------------------------------
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT user_id, name, email, mobile, role, isactive, isapproved, address, age, experience, cookingstyle, services, \`describe\`, businessname, image, rating, approvedby, createdAt, updatedAt FROM Users WHERE user_id = ?",
      [id]
    );

    const user = rows[0];
    const display_url = user.image
      ? (user.image.startsWith("data:") ? `/profiles/image/${user.user_id}` : user.image)
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
      `SELECT user_id, name, email, mobile, isactive, isapproved, address, ${blobSafe("image", "image")}, rating, approvedby, createdAt, updatedAt
       FROM Users WHERE role = 1`
    );

    const processedRows = proxify(rows, req, { field: "image", idField: "user_id", route: "/profiles" });

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
      `SELECT user_id, name, email, mobile, experience, cookingstyle, services,
              isactive, isapproved, address, \`describe\`, ${blobSafe("image", "image")}, rating, age, businessname, approvedby, createdAt, updatedAt
       FROM Users WHERE role = 2`
    );

    const processedRows = proxify(rows, req, { field: "image", idField: "user_id", route: "/profiles" });

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
      `SELECT user_id, name, email, mobile, businessname, isactive, isapproved,
              address, \`describe\`, ${blobSafe("image", "image")}, rating, age, experience, cookingstyle, services, approvedby, createdAt, updatedAt
       FROM Users WHERE role = 3`
    );

    const processedRows = proxify(rows, req, { field: "image", idField: "user_id", route: "/profiles" });

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
  let { id } = req.params;
  const { isactive } = req.body;

  // Resilience: Fallback to body.user_id if params.id is "undefined" or missing
  if ((!id || id === "undefined") && req.body.user_id) {
    id = req.body.user_id;
  }

  if (isactive === undefined) {
    return res
      .status(400)
      .json({ status: false, message: "Missing isactive value" });
  }

  try {
    await db.query(`UPDATE Users SET isactive = ? WHERE user_id = ?`, [
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
// UPDATE USER PROFILE HANDLER
// -------------------------------------------------------------
const updateUserProfile = async (req, res) => {
  let { id } = req.params;
  
  // Resilience: Fallback to body.user_id if params.id is "undefined" or missing
  if ((!id || id === "undefined") && req.body.user_id) {
    id = req.body.user_id;
  }
  const {
    name,
    fullName, // Support both
    email,
    mobile,
    password, // Added password support
    address,
    age,
    experience,
    cookingstyle,
    cookingStyle, // Support both
    services,
    describe,
    declaration, // Support both
    businessname,
    businessName, // Support both
    rating,
    existingImage
  } = req.body;

  try {
    const imageUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : (await resolveExistingImage(existingImage, { table: "Users", column: "image", idColumn: "user_id", id })) || null;

    const sql = `
      UPDATE Users 
      SET name = COALESCE(NULLIF(?, ''), name), email = COALESCE(NULLIF(?, ''), email),
          mobile = COALESCE(NULLIF(?, ''), mobile), password = COALESCE(NULLIF(?, ''), password),
          address = ?, age = ?, 
          experience = ?, cookingstyle = ?, services = ?, \`describe\` = ?, 
          businessname = ?, image = COALESCE(NULLIF(?, ''), image), rating = ?, updatedAt = NOW()
      WHERE user_id = ?
    `;

    const values = [
      // Blank identity fields / image keep the stored value (never wipe a password or email)
      name || fullName || null,
      email || null,
      mobile || null,
      password || null,
      address,
      age || null,
      experience || null,
      Array.isArray(cookingstyle || cookingStyle) ? (cookingstyle || cookingStyle).join(', ') : (cookingstyle || cookingStyle) || '',
      Array.isArray(services) ? services.join(', ') : services || '',
      describe || declaration || '',
      businessname || businessName || '',
      imageUrl,
      rating || null,
      id
    ];

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: false, message: "User not found or no changes made" });
    }

    return res.json({
      status: true,
      message: "User profile updated successfully",
    });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
};

router.put("/user/:id", upload.single("image"), cleanRequest, updateUserProfile);
router.put("/update-chef/:id", upload.single("image"), cleanRequest, updateUserProfile);
router.put("/update-vendor/:id", upload.single("image"), cleanRequest, updateUserProfile);

// -------------------------------------------------------------
// DELETE USER
// -------------------------------------------------------------
router.delete("/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM Users WHERE user_id = ?", [id]);
    return res.json({ status: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: false, message: "Database error" });
  }
});

module.exports = router;
