const express = require("express");
const router = express.Router();
const db = require("../db");
const { blobSafe, proxify } = require("../lib/imageProxy");

/**
 * Vendor catalog
 * ----------------------------------------------------------------------------
 * Bhagona keeps the master list of items for every service. A vendor picks the
 * items they actually provide and can set their own price for each one.
 *
 *   Normal services -> master list is `service_items` (per service),
 *                      vendor picks are stored in `vendor_item_mappings`
 *                      (price_override = vendor's price, NULL = platform price).
 *   Catering        -> master list is `menu_items` (the platform menu),
 *                      vendor picks are stored in `vendor_menu_item_mappings`.
 *
 * A service counts as catering when its name contains "cater" (the service id
 * differs between QA and prod, so it is never hardcoded).
 */

const MAX_PRICE = 10000000;
const MAX_ITEMS = 5000;

// ── Tables ────────────────────────────────────────────────────────────────────
async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vendor_item_mappings (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id       INT NOT NULL,
      service_item_id INT NOT NULL,
      price_override  DECIMAL(10,2) NULL,
      status          ENUM('active','inactive') DEFAULT 'active',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vendor_service_item (vendor_id, service_item_id),
      INDEX idx_vim_service_item (service_item_id)
    )
  `);
  // Older databases may predate these columns.
  if (!(await columnExists("vendor_item_mappings", "price_override"))) {
    await db.query("ALTER TABLE vendor_item_mappings ADD COLUMN price_override DECIMAL(10,2) NULL");
  }
  if (!(await columnExists("vendor_item_mappings", "status"))) {
    await db.query("ALTER TABLE vendor_item_mappings ADD COLUMN status ENUM('active','inactive') DEFAULT 'active'");
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS vendor_menu_item_mappings (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id      INT NOT NULL,
      menu_item_id   INT NOT NULL,
      price_override DECIMAL(10,2) NULL,
      status         ENUM('active','inactive') DEFAULT 'active',
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vendor_menu_item (vendor_id, menu_item_id),
      INDEX idx_vmim_menu_item (menu_item_id)
    )
  `);
}
const ready = ensureTables().catch((err) => console.error("vendor catalog tables init failed:", err.message));

// ── Helpers ───────────────────────────────────────────────────────────────────
const isCateringName = (name) => /cater/i.test(String(name || ""));
const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;

async function getService(serviceId) {
  const [rows] = await db.query("SELECT service_id, name FROM services WHERE service_id = ?", [serviceId]);
  if (!rows.length) return null;
  return { ...rows[0], kind: isCateringName(rows[0].name) ? "menu" : "service" };
}

async function vendorOffersService(vendorId, serviceId) {
  const [rows] = await db.query(
    `SELECT 1
       FROM Users u
       LEFT JOIN vendor_service_mappings vsm ON vsm.vendor_id = u.user_id AND vsm.service_id = ?
      WHERE u.user_id = ?
        AND (vsm.id IS NOT NULL OR FIND_IN_SET(?, REPLACE(COALESCE(u.services, ''), ' ', '')))
      LIMIT 1`,
    [serviceId, vendorId, String(serviceId)]
  );
  return rows.length > 0;
}

function shapeItem(row) {
  const base = Number(row.base_price) || 0;
  const override = row.price_override === null || row.price_override === undefined ? null : Number(row.price_override);
  return {
    ...row,
    base_price: base,
    price_override: override,
    price: override !== null ? override : base,
    is_selected: Number(row.is_selected) === 1 ? 1 : 0,
  };
}

/**
 * Validates `items: [{ item_id, price_override }]`.
 * price_override: empty/null = use platform price; otherwise ₹0.01 – ₹1,00,00,000, max 2 decimals.
 */
function validateSelection(items) {
  if (!Array.isArray(items)) return { error: "items must be an array." };
  if (items.length > MAX_ITEMS) return { error: `You can select at most ${MAX_ITEMS} items.` };

  const errors = {};
  const seen = new Set();
  const clean = [];
  for (const raw of items) {
    const id = toId(raw && raw.item_id);
    if (!id) return { error: "Every item needs a valid item_id." };
    if (seen.has(id)) continue;
    seen.add(id);

    let price = null;
    const p = raw.price_override;
    if (!(p === null || p === undefined || (typeof p === "string" && p.trim() === ""))) {
      const n = Number(p);
      if (!Number.isFinite(n) || n <= 0) errors[id] = "Price must be greater than ₹0.";
      else if (n > MAX_PRICE) errors[id] = "Price cannot exceed ₹1,00,00,000.";
      else if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) errors[id] = "Use at most 2 decimal places.";
      else price = round2(n);
    }
    clean.push({ item_id: id, price_override: price });
  }
  return { errors, items: clean };
}

// Wait for tables before handling any request.
router.use(async (_req, _res, next) => {
  await ready;
  next();
});

// ── GET /vendor-catalog/:vendorId/services/:serviceId ────────────────────────
// Master items for the service, with this vendor's selection and prices.
router.get("/:vendorId/services/:serviceId", async (req, res) => {
  try {
    const vendorId = toId(req.params.vendorId);
    const serviceId = toId(req.params.serviceId);
    if (!vendorId || !serviceId) return res.status(400).json({ status: false, message: "Invalid vendor or service id." });

    const service = await getService(serviceId);
    if (!service) return res.status(404).json({ status: false, message: "Service not found." });
    if (!(await vendorOffersService(vendorId, serviceId))) {
      return res.status(403).json({ status: false, message: "This service is not assigned to your account." });
    }

    let rows;
    if (service.kind === "menu") {
      [rows] = await db.query(
        `SELECT mi.menu_item_id AS item_id, mi.menu_item_id, mi.name, mi.description, mi.price AS base_price,
                ${blobSafe("mi.image_url", "image_url")},
                COALESCE(mc.name, 'Other') AS category_name, ms.name AS subcategory_name,
                vm.price_override, CASE WHEN vm.id IS NULL THEN 0 ELSE 1 END AS is_selected
           FROM menu_items mi
           LEFT JOIN menu_category mc ON mc.id = mi.menu_category_id
           LEFT JOIN menu_subcategory ms ON ms.id = mi.menu_subcategory_id
           LEFT JOIN vendor_menu_item_mappings vm
                  ON vm.menu_item_id = mi.menu_item_id AND vm.vendor_id = ? AND vm.status = 'active'
          WHERE mi.status IS NULL OR mi.status = 'active'
          ORDER BY category_name, mi.name`,
        [vendorId]
      );
      rows = proxify(rows, req, { field: "image_url", idField: "menu_item_id", route: "/menu-items" });
    } else {
      [rows] = await db.query(
        `SELECT si.service_item_id AS item_id, si.service_item_id, si.name, si.description, si.quantity_type,
                si.price AS base_price, ${blobSafe("si.image_url", "image_url")},
                vim.price_override, CASE WHEN vim.id IS NULL THEN 0 ELSE 1 END AS is_selected
           FROM service_items si
           LEFT JOIN vendor_item_mappings vim
                  ON vim.service_item_id = si.service_item_id AND vim.vendor_id = ?
                 AND (vim.status IS NULL OR vim.status = 'active')
          WHERE si.service_id = ? AND (si.status IS NULL OR si.status = 'active')
          ORDER BY si.name`,
        [vendorId, serviceId]
      );
      rows = proxify(rows, req, { field: "image_url", idField: "service_item_id", route: "/service-items" });
    }

    const items = rows.map(shapeItem);
    res.json({
      status: true,
      data: {
        service: { service_id: service.service_id, name: service.name, kind: service.kind },
        items,
        selected_count: items.filter((i) => i.is_selected).length,
      },
    });
  } catch (err) {
    console.error("vendor catalog GET error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// ── PUT /vendor-catalog/:vendorId/services/:serviceId ────────────────────────
// Body: { items: [{ item_id, price_override }] } — replaces the vendor's selection for this service.
router.put("/:vendorId/services/:serviceId", async (req, res) => {
  const vendorId = toId(req.params.vendorId);
  const serviceId = toId(req.params.serviceId);
  if (!vendorId || !serviceId) return res.status(400).json({ status: false, message: "Invalid vendor or service id." });

  const result = validateSelection(req.body && req.body.items);
  if (result.error) return res.status(400).json({ status: false, message: result.error });
  if (Object.keys(result.errors).length) {
    return res.status(400).json({ status: false, message: "Some prices are invalid.", errors: result.errors });
  }

  let connection;
  try {
    const service = await getService(serviceId);
    if (!service) return res.status(404).json({ status: false, message: "Service not found." });
    if (!(await vendorOffersService(vendorId, serviceId))) {
      return res.status(403).json({ status: false, message: "This service is not assigned to your account." });
    }

    const ids = result.items.map((i) => i.item_id);
    const isMenu = service.kind === "menu";

    // Every id must belong to this service's master list.
    const basePrice = new Map();
    if (ids.length) {
      const [valid] = isMenu
        ? await db.query("SELECT menu_item_id AS id, price FROM menu_items WHERE menu_item_id IN (?)", [ids])
        : await db.query("SELECT service_item_id AS id, price FROM service_items WHERE service_id = ? AND service_item_id IN (?)", [serviceId, ids]);
      valid.forEach((v) => basePrice.set(Number(v.id), Number(v.price)));
      const unknown = ids.filter((id) => !basePrice.has(id));
      if (unknown.length) {
        return res.status(400).json({ status: false, message: `Items not available in ${service.name}: ${unknown.join(", ")}` });
      }
    }

    // A price equal to the platform price is stored as NULL so it keeps following the platform price.
    const rows = result.items.map((i) => {
      const override = i.price_override !== null && i.price_override !== basePrice.get(i.item_id) ? i.price_override : null;
      return [vendorId, i.item_id, override, "active"];
    });

    connection = await db.getConnection();
    await connection.beginTransaction();
    if (isMenu) {
      await connection.query("DELETE FROM vendor_menu_item_mappings WHERE vendor_id = ?", [vendorId]);
      if (rows.length) {
        await connection.query("INSERT INTO vendor_menu_item_mappings (vendor_id, menu_item_id, price_override, status) VALUES ?", [rows]);
      }
    } else {
      await connection.query(
        `DELETE vim FROM vendor_item_mappings vim
           JOIN service_items si ON si.service_item_id = vim.service_item_id
          WHERE vim.vendor_id = ? AND si.service_id = ?`,
        [vendorId, serviceId]
      );
      if (rows.length) {
        await connection.query("INSERT INTO vendor_item_mappings (vendor_id, service_item_id, price_override, status) VALUES ?", [rows]);
      }
    }
    await connection.commit();

    res.json({
      status: true,
      message: `${rows.length} item${rows.length === 1 ? "" : "s"} saved for ${service.name}.`,
      data: { selected_count: rows.length, custom_priced: rows.filter((r) => r[2] !== null).length },
    });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("vendor catalog PUT error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * Prices a customer's selected menu for each catering vendor.
 * A vendor who has not picked any menu items yet offers the full platform menu at platform prices.
 * Returns Map<vendorId, { configured, offered_count, total_count, per_plate_total, missing:[names], items:[{menu_item_id, price, base_price}] }>
 */
async function priceMenuForVendors(vendorIds, menuItemIds) {
  const result = new Map();
  if (!vendorIds.length || !menuItemIds.length) return result;
  await ready;

  const [menu] = await db.query("SELECT menu_item_id, name, price FROM menu_items WHERE menu_item_id IN (?)", [menuItemIds]);
  const [maps] = await db.query(
    `SELECT vendor_id, menu_item_id, price_override
       FROM vendor_menu_item_mappings
      WHERE vendor_id IN (?) AND status = 'active'`,
    [vendorIds]
  );

  const byVendor = new Map();
  for (const m of maps) {
    const vid = Number(m.vendor_id);
    if (!byVendor.has(vid)) byVendor.set(vid, new Map());
    byVendor.get(vid).set(Number(m.menu_item_id), m.price_override === null ? null : Number(m.price_override));
  }

  for (const vid of vendorIds) {
    const picks = byVendor.get(vid);
    const configured = !!picks;
    const items = [];
    const missing = [];
    for (const mi of menu) {
      const id = Number(mi.menu_item_id);
      const base = Number(mi.price) || 0;
      if (configured && !picks.has(id)) {
        missing.push(mi.name);
        continue;
      }
      const override = configured ? picks.get(id) : null;
      items.push({ menu_item_id: id, base_price: base, price: override !== null && override !== undefined ? override : base });
    }
    result.set(vid, {
      configured,
      offered_count: items.length,
      total_count: menu.length,
      per_plate_total: round2(items.reduce((s, i) => s + i.price, 0)),
      missing,
      items,
    });
  }
  return result;
}

module.exports = router;
module.exports.priceMenuForVendors = priceMenuForVendors;
module.exports.isCateringName = isCateringName;
module.exports.ready = ready;
