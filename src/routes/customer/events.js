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

        const processedRows = rows.map(row => ({
            ...row,
            display_url: row.image_url && row.image_url.startsWith("data:")
                ? `/events/image/${row.event_id}`
                : row.image_url
        }));

        return res.json({
            status: "success",
            message: "Events fetched successfully",
            data: processedRows
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

        const event = rows[0];
        event.display_url = event.image_url && event.image_url.startsWith("data:")
            ? `/events/image/${event.event_id}`
            : event.image_url;

        return res.json({
            status: "success",
            message: "Event fetched successfully",
            data: event
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
