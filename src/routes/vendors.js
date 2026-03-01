const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/active', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetAllActiveVendors()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/catering', async (req, res) => {
  try {
    const [rows] = await pool.query('CALL GetCateringVendors()');
    res.json({ data: rows[0] || rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------
// 🟢 SYNC VENDOR SERVICES
// -------------------------------------------------------------
router.post("/services/sync", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { vendor_id, service_ids } = req.body;

    if (!vendor_id || !Array.isArray(service_ids)) {
      return res.status(400).json({ status: false, message: "vendor_id and service_ids[] are required" });
    }

    await connection.beginTransaction();

    // 1. Remove old mappings
    await connection.query("DELETE FROM vendor_service_mappings WHERE vendor_id = ?", [vendor_id]);

    // 2. Insert new mappings
    if (service_ids.length > 0) {
      const values = service_ids.map(sid => [vendor_id, sid]);
      await connection.query("INSERT INTO vendor_service_mappings (vendor_id, service_id) VALUES ?", [values]);
    }

    // 3. 🟢 SYNC with legacy 'Users' table column
    const servicesStr = service_ids.join(',');
    await connection.query("UPDATE Users SET services = ? WHERE id = ?", [servicesStr, vendor_id]);

    await connection.commit();
    res.json({ status: true, message: "Services synced successfully" });

  } catch (err) {
    await connection.rollback();
    console.error("❌ Sync Services Error:", err);
    res.status(500).json({ status: false, error: err.message });
  } finally {
    connection.release();
  }
});

// -------------------------------------------------------------
// 🟢 SYNC VENDOR SERVICE ITEMS
// -------------------------------------------------------------
router.post("/items/sync", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { vendor_id, service_id, item_ids } = req.body;

    if (!vendor_id || !service_id || !Array.isArray(item_ids)) {
      return res.status(400).json({ status: false, message: "vendor_id, service_id and item_ids[] are required" });
    }

    await connection.beginTransaction();

    // 1. Remove old mappings for this vendor + service combination
    // We join with service_items to ensure we only remove items belonging to this specific service
    await connection.query(`
      DELETE vim FROM vendor_item_mappings vim
      INNER JOIN service_items si ON vim.service_item_id = si.service_item_id
      WHERE vim.vendor_id = ? AND si.service_id = ?
    `, [vendor_id, service_id]);

    // 2. Insert new mappings
    if (item_ids.length > 0) {
      const values = item_ids.map(iid => [vendor_id, iid]);
      await connection.query("INSERT INTO vendor_item_mappings (vendor_id, service_item_id) VALUES ?", [values]);
    }

    await connection.commit();
    res.json({ status: true, message: "Service items synced successfully" });

  } catch (err) {
    await connection.rollback();
    console.error("❌ Sync Service Items Error:", err);
    res.status(500).json({ status: false, error: err.message });
  } finally {
    connection.release();
  }
});

// -------------------------------------------------------------
// 🟢 GET VENDOR SETUP (Selected Services & Items)
// -------------------------------------------------------------
router.get("/my-setup/:vendor_id", async (req, res) => {
  try {
    const { vendor_id } = req.params;

    // Get selected services
    const [services] = await pool.query(`
      SELECT s.service_id, s.name, s.description
      FROM services s
      INNER JOIN Users u ON FIND_IN_SET(s.service_id, u.services)
      WHERE u.id = ?
    `, [vendor_id]);

    // Get selected items
    const [items] = await pool.query(`
      SELECT si.service_item_id, si.service_id, si.name, si.price
      FROM service_items si
      INNER JOIN vendor_item_mappings vim ON si.service_item_id = vim.service_item_id
      WHERE vim.vendor_id = ?
    `, [vendor_id]);

    res.json({
      status: true,
      data: {
        services,
        items
      }
    });

  } catch (err) {
    console.error("❌ Get Vendor Setup Error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 🟢 GET VENDOR SELECTED SERVICES ONLY
// -------------------------------------------------------------
router.get("/services/:vendor_id", async (req, res) => {
  try {
    const { vendor_id } = req.params;
    console.log(`🔍 Fetching services for Vendor ID: ${vendor_id}`);

    const [rows] = await pool.query(`
      SELECT DISTINCT s.service_id, s.name, s.description, s.image_data,
             (SELECT COUNT(*) FROM vendor_item_mappings vim 
              JOIN service_items si ON vim.service_item_id = si.service_item_id
              WHERE vim.vendor_id = ? AND si.service_id = s.service_id) as item_count
      FROM services s
      LEFT JOIN Users u ON u.id = ?
      LEFT JOIN vendor_service_mappings vsm ON vsm.service_id = s.service_id AND vsm.vendor_id = ?
      WHERE FIND_IN_SET(s.service_id, REPLACE(u.services, ' ', '')) 
         OR vsm.vendor_id IS NOT NULL
    `, [vendor_id, vendor_id, vendor_id]);

    console.log(`✅ Found ${rows.length} services for Vendor ${vendor_id}`);

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image_data
        ? (row.image_data.startsWith("data:") ? `/services/image/${row.service_id}` : row.image_data)
        : null
    }));

    res.json({
      status: true,
      data: processedRows
    });

  } catch (err) {
    console.error("❌ Get Vendor Services Error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 🟢 GET ALL ITEMS FOR A SERVICE WITH VENDOR SELECTION STATUS
// -------------------------------------------------------------
router.get("/service-items/:vendor_id/:service_id", async (req, res) => {
  try {
    const { vendor_id, service_id } = req.params;

    const [rows] = await pool.query(`
      SELECT si.service_item_id, si.name, si.description, si.price, si.quantity_type, si.image_url,
             CASE WHEN vim.vendor_id IS NOT NULL THEN 1 ELSE 0 END as is_selected
      FROM service_items si
      LEFT JOIN vendor_item_mappings vim ON si.service_item_id = vim.service_item_id AND vim.vendor_id = ?
      WHERE si.service_id = ? AND si.status = 'active'
    `, [vendor_id, service_id]);

    const processedRows = rows.map(row => ({
      ...row,
      display_url: row.image_url
        ? (row.image_url.startsWith("data:") ? `/service-items/image/${row.service_item_id}` : row.image_url)
        : null
    }));

    res.json({
      status: true,
      data: processedRows
    });

  } catch (err) {
    console.error("❌ Get Vendor Service Items Status Error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = router;



