const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Discount rules
 * ----------------------------------------------------------------------------
 * A rule gives a discount when an order meets a condition:
 *   rule_type      'guest_count'  -> guest count  >= min_value
 *                  'bill_amount'  -> bill amount  >= min_value (₹)
 *   discount_type  'fixed'        -> flat ₹ discount_value off
 *                  'percentage'   -> discount_value % off, optionally capped by max_discount
 *
 * Ownership:
 *   vendor_id = <user id>  -> rule belongs to that chef/vendor, applies to their orders only
 *   vendor_id = NULL       -> platform-wide rule (created by admin), applies to every vendor
 *
 * Roles (Users.role): 2 = chef, 3 = vendor, 4 = admin.
 */

const ROLE_ADMIN = 4;
const PARTNER_ROLES = [2, 3, 4];
const RULE_TYPES = ["guest_count", "bill_amount"];
const DISCOUNT_TYPES = ["fixed", "percentage"];

// ── Tables (created on startup if missing, same approach as order_proofs) ─────
async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS discount_rules (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id      INT NULL,
      title          VARCHAR(100) NOT NULL,
      description    VARCHAR(255) NULL,
      rule_type      ENUM('guest_count','bill_amount') NOT NULL,
      min_value      DECIMAL(12,2) NOT NULL,
      discount_type  ENUM('fixed','percentage') NOT NULL,
      discount_value DECIMAL(12,2) NOT NULL,
      max_discount   DECIMAL(12,2) NULL,
      start_date     DATE NULL,
      end_date       DATE NULL,
      is_active      TINYINT(1) NOT NULL DEFAULT 1,
      created_by     INT NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_discount_rules_vendor (vendor_id),
      INDEX idx_discount_rules_active (is_active)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS booking_discounts (
      booking_id       INT PRIMARY KEY,
      discount_rule_id INT NULL,
      vendor_id        INT NULL,
      title            VARCHAR(100) NULL,
      rule_type        VARCHAR(20) NULL,
      discount_type    VARCHAR(20) NULL,
      discount_value   DECIMAL(12,2) NULL,
      bill_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
      guest_count      INT NOT NULL DEFAULT 0,
      discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_booking_discounts_rule (discount_rule_id)
    )
  `);
}
const ready = ensureTables().catch((err) => console.error("discount tables init failed:", err.message));

// ── Helpers ───────────────────────────────────────────────────────────────────
const RULE_COLUMNS = `
  r.id, r.vendor_id, r.title, r.description, r.rule_type, r.min_value, r.discount_type,
  r.discount_value, r.max_discount,
  DATE_FORMAT(r.start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(r.end_date, '%Y-%m-%d')   AS end_date,
  r.is_active, r.created_by, r.created_at, r.updated_at`;

const ACTIVE_WINDOW = `
  r.is_active = 1
  AND (r.start_date IS NULL OR r.start_date <= CURDATE())
  AND (r.end_date   IS NULL OR r.end_date   >= CURDATE())`;

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const toNum = (v) => (isBlank(v) ? NaN : Number(v));
const round2 = (n) => Math.round(n * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function normalizeRule(row) {
  return {
    ...row,
    vendor_id: row.vendor_id === null ? null : Number(row.vendor_id),
    min_value: Number(row.min_value),
    discount_value: Number(row.discount_value),
    max_discount: row.max_discount === null ? null : Number(row.max_discount),
    is_active: Number(row.is_active) === 1 ? 1 : 0,
    scope: row.vendor_id === null ? "platform" : "vendor",
  };
}

/** Discount (₹) a rule gives on a bill. Never more than the bill minus ₹1. */
function computeDiscount(rule, billAmount) {
  if (!(billAmount > 0)) return 0;
  let amount =
    rule.discount_type === "percentage"
      ? (billAmount * Number(rule.discount_value)) / 100
      : Number(rule.discount_value);
  if (rule.discount_type === "percentage" && rule.max_discount !== null && Number(rule.max_discount) > 0) {
    amount = Math.min(amount, Number(rule.max_discount));
  }
  amount = Math.min(amount, Math.max(billAmount - 1, 0));
  return round2(Math.max(amount, 0));
}

function isEligible(rule, guestCount, billAmount) {
  if (rule.rule_type === "guest_count") return guestCount >= Number(rule.min_value);
  return billAmount >= Number(rule.min_value);
}

/** Validates and normalises a create/update payload. Returns { errors, data }. */
function validateRule(body, { isCreate }) {
  const errors = {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const ruleType = body.rule_type;
  const discountType = body.discount_type;
  const minValue = toNum(body.min_value);
  const discountValue = toNum(body.discount_value);
  const maxDiscount = isBlank(body.max_discount) ? null : toNum(body.max_discount);
  const startDate = isBlank(body.start_date) ? null : String(body.start_date).trim();
  const endDate = isBlank(body.end_date) ? null : String(body.end_date).trim();

  if (title.length < 3 || title.length > 100) errors.title = "Title must be 3 to 100 characters.";
  if (description.length > 255) errors.description = "Description must be 255 characters or fewer.";

  if (!RULE_TYPES.includes(ruleType)) errors.rule_type = "Choose a condition: guest count or bill amount.";
  if (!DISCOUNT_TYPES.includes(discountType)) errors.discount_type = "Choose a discount type: fixed or percentage.";

  if (ruleType === "guest_count") {
    if (!Number.isInteger(minValue) || minValue < 1 || minValue > 100000) {
      errors.min_value = "Minimum guests must be a whole number between 1 and 100,000.";
    }
  } else if (ruleType === "bill_amount") {
    if (!Number.isFinite(minValue) || minValue < 1 || minValue > 100000000) {
      errors.min_value = "Minimum bill amount must be between ₹1 and ₹10,00,00,000.";
    }
  }

  if (discountType === "percentage") {
    if (!Number.isFinite(discountValue) || discountValue <= 0 || discountValue >= 100) {
      errors.discount_value = "Percentage must be greater than 0 and less than 100.";
    }
    if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount < 1)) {
      errors.max_discount = "Maximum discount must be at least ₹1, or leave it empty.";
    }
  } else if (discountType === "fixed") {
    if (!Number.isFinite(discountValue) || discountValue < 1 || discountValue > 10000000) {
      errors.discount_value = "Fixed discount must be between ₹1 and ₹1,00,00,000.";
    } else if (ruleType === "bill_amount" && Number.isFinite(minValue) && discountValue >= minValue) {
      errors.discount_value = "Fixed discount must be less than the minimum bill amount.";
    }
  }

  if (startDate && !DATE_RE.test(startDate)) errors.start_date = "Start date is invalid.";
  if (endDate && !DATE_RE.test(endDate)) errors.end_date = "End date is invalid.";
  if (!errors.start_date && !errors.end_date && startDate && endDate && endDate < startDate) {
    errors.end_date = "End date cannot be before the start date.";
  }
  if (isCreate && !errors.end_date && endDate && endDate < todayStr()) {
    errors.end_date = "End date cannot be in the past.";
  }

  const isActive = body.is_active === undefined ? 1 : Number(body.is_active) === 1 || body.is_active === true ? 1 : 0;

  return {
    errors,
    data: {
      title,
      description: description || null,
      rule_type: ruleType,
      min_value: minValue,
      discount_type: discountType,
      discount_value: discountValue,
      max_discount: discountType === "percentage" ? maxDiscount : null,
      start_date: startDate,
      end_date: endDate,
      is_active: isActive,
    },
  };
}

/** Reads the acting user from the request (the admin app sends its logged-in user). */
function getActor(req) {
  const src = { ...req.query, ...(req.body || {}) };
  const id = Number(src.actor_id);
  const role = Number(src.actor_role);
  if (!Number.isInteger(id) || id <= 0 || !PARTNER_ROLES.includes(role)) return null;
  return { id, role, isAdmin: role === ROLE_ADMIN };
}

const canManage = (actor, rule) => actor.isAdmin || (rule.vendor_id !== null && Number(rule.vendor_id) === actor.id);

async function findRule(id) {
  const [rows] = await db.query(`SELECT ${RULE_COLUMNS} FROM discount_rules r WHERE r.id = ?`, [id]);
  return rows[0] ? normalizeRule(rows[0]) : null;
}

/** Another active rule with the same owner + condition + threshold would make results ambiguous. */
async function findDuplicate(vendorId, data, excludeId = 0) {
  const [rows] = await db.query(
    `SELECT id FROM discount_rules
      WHERE ((? IS NULL AND vendor_id IS NULL) OR vendor_id = ?)
        AND rule_type = ? AND min_value = ? AND is_active = 1 AND id <> ?
      LIMIT 1`,
    [vendorId, vendorId, data.rule_type, data.min_value, excludeId]
  );
  return rows.length > 0;
}

/** Active rules (inside their date window) that apply to a vendor: their own + platform-wide. */
async function getActiveRules(vendorIds) {
  await ready;
  const ids = (Array.isArray(vendorIds) ? vendorIds : [vendorIds]).filter(Boolean);
  const [rows] = ids.length
    ? await db.query(`SELECT ${RULE_COLUMNS} FROM discount_rules r WHERE ${ACTIVE_WINDOW} AND (r.vendor_id IS NULL OR r.vendor_id IN (?))`, [ids])
    : await db.query(`SELECT ${RULE_COLUMNS} FROM discount_rules r WHERE ${ACTIVE_WINDOW} AND r.vendor_id IS NULL`);
  return rows.map(normalizeRule);
}

/** Best eligible rule (largest ₹ discount) from a rule list; vendor rules win ties. */
function pickBest(rules, guestCount, billAmount) {
  let best = null;
  for (const row of rules) {
    if (!isEligible(row, guestCount, billAmount)) continue;
    const amount = computeDiscount(row, billAmount);
    if (amount <= 0) continue;
    if (
      !best ||
      amount > best.discount_amount ||
      (amount === best.discount_amount && best.rule.vendor_id === null && row.vendor_id !== null)
    ) {
      best = { rule: row, discount_amount: amount };
    }
  }
  return best;
}

/** Best eligible rule (largest ₹ discount) for a vendor's order; vendor rules win ties. */
async function findBestDiscount(vendorId, guestCount, billAmount) {
  return pickBest(await getActiveRules(vendorId), guestCount, billAmount);
}

function ruleLabel(rule) {
  const value = rule.discount_type === "percentage"
    ? `${Number(rule.discount_value)}% off`
    : `₹${Number(rule.discount_value).toLocaleString("en-IN")} off`;
  const cond = rule.rule_type === "guest_count"
    ? `${Number(rule.min_value)}+ guests`
    : `bills of ₹${Number(rule.min_value).toLocaleString("en-IN")}+`;
  return { value, cond, text: `${value} on ${cond}` };
}

/**
 * Prices an order against a rule list: the discount that applies now, plus up to `limit`
 * offers the customer could unlock by adding guests or spending more, each worth more than
 * the current discount. `perPlate` (₹ per guest) lets guest-count offers project the bill.
 */
function evaluateOrder(rules, { guestCount, billAmount, perPlate = 0, limit = 2 }) {
  const best = pickBest(rules, guestCount, billAmount);
  const current = best ? best.discount_amount : 0;

  const upcoming = [];
  for (const rule of rules) {
    if (isEligible(rule, guestCount, billAmount)) continue;
    let projectedBill, gap;
    if (rule.rule_type === "guest_count") {
      const needed = Math.ceil(Number(rule.min_value) - guestCount);
      if (needed <= 0) continue;
      projectedBill = perPlate > 0 ? perPlate * Number(rule.min_value) : billAmount;
      gap = { guests_needed: needed, ratio: needed / Number(rule.min_value) };
    } else {
      const needed = round2(Number(rule.min_value) - billAmount);
      if (needed <= 0) continue;
      projectedBill = Number(rule.min_value);
      gap = { amount_needed: needed, ratio: needed / Number(rule.min_value) };
    }
    const projected = computeDiscount(rule, projectedBill);
    if (projected <= current) continue; // not better than what they already get
    const label = ruleLabel(rule);
    upcoming.push({
      rule_id: rule.id,
      title: rule.title,
      scope: rule.scope,
      rule_type: rule.rule_type,
      min_value: Number(rule.min_value),
      discount_type: rule.discount_type,
      discount_value: Number(rule.discount_value),
      guests_needed: gap.guests_needed ?? null,
      amount_needed: gap.amount_needed ?? null,
      projected_discount: projected,
      message: rule.rule_type === "guest_count"
        ? `Add ${gap.guests_needed} more guest${gap.guests_needed === 1 ? "" : "s"} to get ${label.value}`
        : `Add ₹${gap.amount_needed.toLocaleString("en-IN")} more to get ${label.value}`,
      _ratio: gap.ratio,
    });
  }
  upcoming.sort((a, b) => a._ratio - b._ratio || b.projected_discount - a.projected_discount);

  return {
    applied: !!best,
    discount_amount: current,
    bill_amount: billAmount,
    total_after_discount: round2(Math.max(billAmount - current, 0)),
    rule: best ? { id: best.rule.id, title: best.rule.title, scope: best.rule.scope, ...ruleLabel(best.rule),
      rule_type: best.rule.rule_type, discount_type: best.rule.discount_type, discount_value: best.rule.discount_value,
      min_value: best.rule.min_value } : null,
    upcoming: upcoming.slice(0, limit).map(({ _ratio, ...u }) => u),
  };
}

function parseOrderInput(src) {
  const vendorId = Number(src.vendor_id);
  const guestCount = Number(src.guest_count);
  const billAmount = Number(src.bill_amount);
  return {
    vendorId: Number.isInteger(vendorId) && vendorId > 0 ? vendorId : null,
    guestCount: Number.isFinite(guestCount) && guestCount > 0 ? Math.floor(guestCount) : 0,
    billAmount: Number.isFinite(billAmount) && billAmount > 0 ? round2(billAmount) : 0,
  };
}

function shapeResult(best, billAmount) {
  if (!best) return { applied: false, discount_amount: 0, bill_amount: billAmount, rule: null };
  const { rule, discount_amount } = best;
  return {
    applied: true,
    discount_amount,
    bill_amount: billAmount,
    rule: {
      id: rule.id,
      title: rule.title,
      scope: rule.scope,
      rule_type: rule.rule_type,
      min_value: rule.min_value,
      discount_type: rule.discount_type,
      discount_value: rule.discount_value,
      max_discount: rule.max_discount,
    },
  };
}

// Make sure tables exist before any request touches them.
router.use(async (_req, _res, next) => {
  await ready;
  next();
});

// ── Customer: best discount for an order (preview) ───────────────────────────
// GET /discounts/applicable?vendor_id=&guest_count=&bill_amount=
router.get("/applicable", async (req, res) => {
  try {
    const { vendorId, guestCount, billAmount } = parseOrderInput(req.query);
    if (billAmount <= 0) return res.json({ status: true, data: shapeResult(null, 0) });
    const best = await findBestDiscount(vendorId, guestCount, billAmount);
    res.json({ status: true, data: shapeResult(best, billAmount) });
  } catch (err) {
    console.error("discounts/applicable error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// ── Customer: lock the discount onto a booking (server recomputes it) ────────
// POST /discounts/apply { booking_id, vendor_id, guest_count, bill_amount }
router.post("/apply", async (req, res) => {
  try {
    const bookingId = Number(req.body.booking_id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ status: false, message: "A valid booking_id is required." });
    }
    const [bookings] = await db.query("SELECT booking_id FROM bookings WHERE booking_id = ?", [bookingId]);
    if (!bookings.length) return res.status(404).json({ status: false, message: "Booking not found." });

    const { vendorId, guestCount, billAmount } = parseOrderInput(req.body);
    const best = billAmount > 0 ? await findBestDiscount(vendorId, guestCount, billAmount) : null;

    if (!best) {
      await db.query("DELETE FROM booking_discounts WHERE booking_id = ?", [bookingId]);
      return res.json({ status: true, data: shapeResult(null, billAmount) });
    }

    const { rule, discount_amount } = best;
    await db.query(
      `INSERT INTO booking_discounts
         (booking_id, discount_rule_id, vendor_id, title, rule_type, discount_type, discount_value,
          bill_amount, guest_count, discount_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         discount_rule_id = VALUES(discount_rule_id), vendor_id = VALUES(vendor_id), title = VALUES(title),
         rule_type = VALUES(rule_type), discount_type = VALUES(discount_type),
         discount_value = VALUES(discount_value), bill_amount = VALUES(bill_amount),
         guest_count = VALUES(guest_count), discount_amount = VALUES(discount_amount)`,
      [bookingId, rule.id, rule.vendor_id, rule.title, rule.rule_type, rule.discount_type,
        rule.discount_value, billAmount, guestCount, discount_amount]
    );
    res.json({ status: true, data: shapeResult(best, billAmount) });
  } catch (err) {
    console.error("discounts/apply error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// GET /discounts/booking/:bookingId — discount recorded on a booking
router.get("/booking/:bookingId", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM booking_discounts WHERE booking_id = ?", [req.params.bookingId]);
    res.json({ status: true, data: rows[0] || null });
  } catch (err) {
    console.error("discounts/booking error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// ── Partner/admin: list rules ─────────────────────────────────────────────────
// GET /discounts?actor_id=&actor_role=
//   admin   -> every rule (with vendor name)
//   partner -> own rules + platform-wide rules (read-only for them)
router.get("/", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor) return res.status(400).json({ status: false, message: "actor_id and a valid actor_role are required." });

    const where = actor.isAdmin ? "1 = 1" : "(r.vendor_id = ? OR r.vendor_id IS NULL)";
    const params = actor.isAdmin ? [] : [actor.id];
    const [rows] = await db.query(
      `SELECT ${RULE_COLUMNS}, COALESCE(NULLIF(u.businessname, ''), u.name) AS vendor_name, u.role AS vendor_role,
              (SELECT COUNT(*) FROM booking_discounts bd WHERE bd.discount_rule_id = r.id) AS times_used
         FROM discount_rules r
         LEFT JOIN Users u ON u.user_id = r.vendor_id
        WHERE ${where}
        ORDER BY r.is_active DESC, r.created_at DESC`,
      params
    );
    const data = rows.map((row) => {
      const rule = normalizeRule(row);
      return { ...rule, times_used: Number(row.times_used) || 0, can_edit: canManage(actor, rule) };
    });
    res.json({ status: true, data });
  } catch (err) {
    console.error("discounts list error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// GET /discounts/:id
router.get("/:id", async (req, res) => {
  try {
    const rule = await findRule(req.params.id);
    if (!rule) return res.status(404).json({ status: false, message: "Discount not found." });
    res.json({ status: true, data: rule });
  } catch (err) {
    console.error("discounts get error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// POST /discounts  (admin -> platform-wide rule, chef/vendor -> own rule)
router.post("/", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor) return res.status(403).json({ status: false, message: "Only chefs, vendors and admins can create discounts." });

    const { errors, data } = validateRule(req.body, { isCreate: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ status: false, message: Object.values(errors)[0], errors });
    }

    const vendorId = actor.isAdmin ? null : actor.id;
    if (data.is_active && (await findDuplicate(vendorId, data))) {
      return res.status(409).json({
        status: false,
        message: "An active discount with the same condition and minimum already exists.",
        errors: { min_value: "Duplicate of an existing active discount." },
      });
    }

    const [result] = await db.query(
      `INSERT INTO discount_rules
         (vendor_id, title, description, rule_type, min_value, discount_type, discount_value, max_discount,
          start_date, end_date, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vendorId, data.title, data.description, data.rule_type, data.min_value, data.discount_type,
        data.discount_value, data.max_discount, data.start_date, data.end_date, data.is_active, actor.id]
    );
    res.status(201).json({ status: true, message: "Discount created successfully.", data: await findRule(result.insertId) });
  } catch (err) {
    console.error("discounts create error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// PUT /discounts/:id
router.put("/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor) return res.status(403).json({ status: false, message: "Not allowed." });

    const existing = await findRule(req.params.id);
    if (!existing) return res.status(404).json({ status: false, message: "Discount not found." });
    if (!canManage(actor, existing)) return res.status(403).json({ status: false, message: "You can only edit your own discounts." });

    const { errors, data } = validateRule(req.body, { isCreate: false });
    if (Object.keys(errors).length) {
      return res.status(400).json({ status: false, message: Object.values(errors)[0], errors });
    }
    if (data.is_active && (await findDuplicate(existing.vendor_id, data, existing.id))) {
      return res.status(409).json({
        status: false,
        message: "An active discount with the same condition and minimum already exists.",
        errors: { min_value: "Duplicate of an existing active discount." },
      });
    }

    await db.query(
      `UPDATE discount_rules
          SET title = ?, description = ?, rule_type = ?, min_value = ?, discount_type = ?, discount_value = ?,
              max_discount = ?, start_date = ?, end_date = ?, is_active = ?
        WHERE id = ?`,
      [data.title, data.description, data.rule_type, data.min_value, data.discount_type, data.discount_value,
        data.max_discount, data.start_date, data.end_date, data.is_active, existing.id]
    );
    res.json({ status: true, message: "Discount updated successfully.", data: await findRule(existing.id) });
  } catch (err) {
    console.error("discounts update error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// PATCH /discounts/:id/status { is_active }
router.patch("/:id/status", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor) return res.status(403).json({ status: false, message: "Not allowed." });

    const existing = await findRule(req.params.id);
    if (!existing) return res.status(404).json({ status: false, message: "Discount not found." });
    if (!canManage(actor, existing)) return res.status(403).json({ status: false, message: "You can only change your own discounts." });

    const isActive = Number(req.body.is_active) === 1 || req.body.is_active === true ? 1 : 0;
    if (isActive && (await findDuplicate(existing.vendor_id, existing, existing.id))) {
      return res.status(409).json({ status: false, message: "Another active discount already uses this condition and minimum." });
    }
    await db.query("UPDATE discount_rules SET is_active = ? WHERE id = ?", [isActive, existing.id]);
    res.json({ status: true, message: isActive ? "Discount activated." : "Discount paused.", data: { id: existing.id, is_active: isActive } });
  } catch (err) {
    console.error("discounts status error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

// DELETE /discounts/:id?actor_id=&actor_role=
router.delete("/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor) return res.status(403).json({ status: false, message: "Not allowed." });

    const existing = await findRule(req.params.id);
    if (!existing) return res.status(404).json({ status: false, message: "Discount not found." });
    if (!canManage(actor, existing)) return res.status(403).json({ status: false, message: "You can only delete your own discounts." });

    // booking_discounts keeps its own snapshot, so past orders are unaffected.
    await db.query("DELETE FROM discount_rules WHERE id = ?", [existing.id]);
    res.json({ status: true, message: "Discount deleted successfully." });
  } catch (err) {
    console.error("discounts delete error:", err);
    res.status(500).json({ status: false, message: "Database error" });
  }
});

module.exports = router;
module.exports.computeDiscount = computeDiscount;
module.exports.getActiveRules = getActiveRules;
module.exports.evaluateOrder = evaluateOrder;
