const express = require("express");
const router = express.Router();
const pool = require("../../db");
const { blobSafe, proxify } = require("../../lib/imageProxy");

// ---------------------- GET ALL ACTIVE SERVICES ----------------------
// URL: GET /customer/services/
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT service_id, name, description, unit_id, ${blobSafe("image_data", "image_data")} FROM services WHERE status = 'active' ORDER BY service_id DESC`
        );

        const processedRows = proxify(rows, req, { field: "image_data", idField: "service_id", route: "/services" });

        return res.json({
            status: "success",
            message: "Services fetched successfully",
            data: processedRows
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
            `SELECT service_id, name AS service_name, description AS service_description, unit_id, ${blobSafe("image_data", "image_data")} FROM services WHERE service_id = ? AND status = 'active'`,
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
            `SELECT service_item_id, name, description, quantity_type, price, ${blobSafe("image_url", "image_url")} FROM service_items WHERE service_id = ? ORDER BY service_item_id ASC`,
            [id]
        );

        const service = serviceRows[0];
        proxify(service, req, { field: "image_data", idField: "service_id", route: "/services" });

        // Note: service_items image_url also needs proxying if they are base64
        const processedItems = proxify(itemRows, req, { field: "image_url", idField: "service_item_id", route: "/service-items" });

        return res.json({
            status: "success",
            message: "Service details fetched successfully",
            data: {
                ...service,
                items: processedItems
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
