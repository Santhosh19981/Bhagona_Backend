const express = require("express");
const router = express.Router();
const pool = require("../../db");
const { blobSafe, proxify } = require("../../lib/imageProxy");

// ---------------------- GET ALL ACTIVE EVENTS ----------------------
// URL: GET /customer/events/
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT event_id, name, description, ${blobSafe("image_url", "image_url")} FROM events WHERE status = 'active' ORDER BY event_id DESC`
        );

        const processedRows = proxify(rows, req, { field: "image_url", idField: "event_id", route: "/events" });

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
            `SELECT event_id, name, description, ${blobSafe("image_url", "image_url")} FROM events WHERE event_id = ? AND status = 'active'`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Event not found or inactive"
            });
        }

        const event = rows[0];
        proxify(event, req, { field: "image_url", idField: "event_id", route: "/events" });

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
