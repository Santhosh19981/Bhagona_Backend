const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ---------------------- GET SERVICE DETAILS AND ITEMS BY SERVICE ID ----------------------
// URL: GET /customer/service-items/:serviceId
router.get("/:serviceId", async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Fetch service info
        const [serviceRows] = await pool.query(
            "SELECT service_id, name, description, unit_id, image_data FROM services WHERE service_id = ? AND status = 'active'",
            [serviceId]
        );

        if (serviceRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Service not found or inactive"
            });
        }

        // Fetch service items
        const [itemRows] = await pool.query(
            "SELECT service_item_id, service_id, name, description, quantity_type, price, status, image_url FROM service_items WHERE service_id = ? AND status = 'active' ORDER BY service_item_id ASC",
            [serviceId]
        );

        const service = serviceRows[0];

        // Process service image_data to display_url
        service.display_url = service.image_data
            ? (service.image_data.toString().startsWith("data:") ? `/services/image/${service.service_id}` : service.image_data)
            : null;

        // Process service items image_url to display_url
        const processedItems = itemRows.map(item => ({
            ...item,
            display_url: item.image_url
                ? (item.image_url.toString().startsWith("data:") ? `/service-items/image/${item.service_item_id}` : item.image_url)
                : null
        }));

        return res.json({
            status: "success",
            message: "Service details and items fetched successfully",
            data: {
                ...service,
                items: processedItems
            }
        });

    } catch (err) {
        console.error("❌ CUSTOMER GET service items by service error:", err);
        res.status(500).json({
            status: "error",
            message: "Server error",
        });
    }
});

module.exports = router;
