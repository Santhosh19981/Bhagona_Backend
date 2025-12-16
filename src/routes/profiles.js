const express = require("express");
const router = express.Router();
const db = require("../db"); // mysql2/promise

// -------------------------------------------------------------
// GET ALL CUSTOMERS (role = 1)
// -------------------------------------------------------------
router.get("/customers", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, mobile, isactive, isapproved, address , createdAt
       FROM Users WHERE role = 1`
    );

    return res.json({ status: true, data: rows });
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
              isactive, isapproved, address, \`describe\`
       FROM Users WHERE role = 2`
    );

    return res.json({ status: true, data: rows });
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
              address, \`describe\`
       FROM Users WHERE role = 3`
    );

    return res.json({ status: true, data: rows });
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

module.exports = router;
