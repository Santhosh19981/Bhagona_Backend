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
      INNER JOIN vendor_service_mappings vsm ON s.service_id = vsm.service_id
      WHERE vsm.vendor_id = ?
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

module.exports = router;

