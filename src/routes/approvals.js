const express = require("express");
const router = express.Router();
const mysql = require("../db"); // mysql2/promise

// -------------------------------------------------------------
// GET ALL USERS
// -------------------------------------------------------------
router.get("/all", async (req, res) => {
  const query = `
    SELECT user_id AS id, name, email, role, mobile, experience, businessname, isapproved, approvedby, address, age, cookingstyle, \`describe\`, services, image
    FROM Users
    WHERE role = '2' OR role = '3'
    ORDER BY user_id DESC
  `;

  try {
    const [results] = await mysql.query(query);

    res.status(200).json({
      status: true,
      data: results
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({
      status: false,
      message: "Database error"
    });
  }
});

// -------------------------------------------------------------
// GET ONLY PENDING USERS
// -------------------------------------------------------------
router.get("/pending", async (req, res) => {
  const query = `
    SELECT user_id AS id, name, email, role, mobile, experience, businessname, isapproved, address, age, cookingstyle, \`describe\`, services, image
    FROM Users
    WHERE (role = '2' OR role = '3') AND isapproved = 0
    ORDER BY user_id DESC
  `;

  try {
    const [results] = await mysql.query(query);

    res.status(200).json({
      status: true,
      data: results
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({
      status: false,
      message: "Database error"
    });
  }
});

// -------------------------------------------------------------
// GET ONLY APPROVED PARTNERS
// -------------------------------------------------------------
router.get("/approved", async (req, res) => {
  const query = `
    SELECT user_id AS id, name, email, role, mobile, experience, businessname, isapproved, approvedby, address, age, cookingstyle, \`describe\`, services, image
    FROM Users
    WHERE (role = '2' OR role = '3') AND isapproved = 1
    ORDER BY user_id DESC
  `;

  try {
    const [results] = await mysql.query(query);

    res.status(200).json({
      status: true,
      data: results
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({
      status: false,
      message: "Database error"
    });
  }
});

// -------------------------------------------------------------
// GET ONLY REJECTED USERS
// -------------------------------------------------------------
router.get("/rejected", async (req, res) => {
  const query = `
    SELECT user_id AS id, name, email, role, mobile, experience, businessname, isapproved, address, age, cookingstyle, \`describe\`, services, image
    FROM Users
    WHERE (role = '2' OR role = '3') AND isapproved = 2
    ORDER BY user_id DESC
  `;

  try {
    const [results] = await mysql.query(query);

    res.status(200).json({
      status: true,
      data: results
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({
      status: false,
      message: "Database error"
    });
  }
});

// -------------------------------------------------------------
// APPROVE USER
// -------------------------------------------------------------
router.put("/approve/:id", async (req, res) => {
  const id = req.params.id;
  const approvedBy = 1;

  const query = `
    UPDATE Users 
    SET isapproved = 1, isactive = 1, approvedby = ?
    WHERE user_id = ?
  `;

  try {
    await mysql.query(query, [approvedBy, id]);

    res.status(200).json({
      status: true,
      message: "User approved successfully"
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({
      status: false,
      message: "Database error"
    });
  }
});

// -------------------------------------------------------------
// REJECT USER
// -------------------------------------------------------------
router.put("/reject/:id", async (req, res) => {
  const id = req.params.id;

  const query = `
    UPDATE Users
    SET isapproved = 2, isactive = 0, approvedby = NULL
    WHERE user_id = ?
  `;

  try {
    await mysql.query(query, [id]);

    res.status(200).json({
      status: true,
      message: "User rejected successfully"
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({
      status: false,
      message: "Database error"
    });
  }
});

module.exports = router;
