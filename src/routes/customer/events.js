const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ---------------------- GET ALL ACTIVE EVENTS ----------------------
// URL: GET /customer/events/
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT event_id, name, description, image_url FROM events WHERE status = 'active' ORDER BY event_id DESC"
        );

        return res.json({
            status: "success",
            message: "Events fetched successfully",
            data: rows
        });

    } catch (err) {
        console.error("❌ CUSTOMER GET events error:", err);
        res.status(500).json({
            status: "error",
            message: "Server error",
        });
    }
});

// ---------------------- GET EVENT BY ID ----------------------
// URL: GET /customer/events/:id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            "SELECT event_id, name, description, image_url FROM events WHERE event_id = ? AND status = 'active'",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Event not found or inactive"
            });
        }

        return res.json({
            status: "success",
            message: "Event fetched successfully",
            data: rows[0]
        });

    } catch (err) {
        console.error("❌ CUSTOMER GET event by id error:", err);
        res.status(500).json({
            status: "error",
            message: "Server error",
        });
    }
});

module.exports = router;
