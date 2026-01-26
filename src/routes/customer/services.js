const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ---------------------- GET ALL ACTIVE SERVICES ----------------------
// URL: GET /customer/services/
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT service_id, name, description, unit_id, image_data FROM services WHERE status = 'active' ORDER BY service_id DESC"
        );

        return res.json({
            status: "success",
            message: "Services fetched successfully",
            data: rows
        });

    } catch (err) {
        console.error("❌ CUSTOMER GET services error:", err);
        res.status(500).json({
            status: "error",
            message: "Server error",
        });
    }
});

// ---------------------- GET SERVICE BY ID (WITH ITEMS) ----------------------
// URL: GET /customer/services/:id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch service info with aliased names
        const [serviceRows] = await pool.query(
            "SELECT service_id, name AS service_name, description AS service_description, unit_id, image_data FROM services WHERE service_id = ? AND status = 'active'",
            [id]
        );

        if (serviceRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Service not found or inactive"
            });
        }

        // Fetch service items
        const [itemRows] = await pool.query(
            "SELECT service_item_id, name, description, quantity_type, price, image_url FROM service_items WHERE service_id = ? ORDER BY service_item_id ASC",
            [id]
        );

        return res.json({
            status: "success",
            message: "Service details fetched successfully",
            data: {
                ...serviceRows[0],
                items: itemRows
            }
        });

    } catch (err) {
        console.error("❌ CUSTOMER GET service by id with items error:", err);
        res.status(500).json({
            status: "error",
            message: "Server error",
        });
    }
});

module.exports = router;
