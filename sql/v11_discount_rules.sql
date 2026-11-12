-- Volume discount rules (guest count / bill amount, fixed / percentage).
-- These tables are also created automatically on server start by src/routes/discounts.js;
-- this file is for reference and manual setup.

CREATE TABLE IF NOT EXISTS discount_rules (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id      INT NULL,                                   -- NULL = platform-wide (admin)
  title          VARCHAR(100) NOT NULL,
  description    VARCHAR(255) NULL,
  rule_type      ENUM('guest_count','bill_amount') NOT NULL,
  min_value      DECIMAL(12,2) NOT NULL,                     -- min guests, or min bill in ₹
  discount_type  ENUM('fixed','percentage') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL,
  max_discount   DECIMAL(12,2) NULL,                         -- cap for percentage discounts
  start_date     DATE NULL,
  end_date       DATE NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_by     INT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_discount_rules_vendor (vendor_id),
  INDEX idx_discount_rules_active (is_active)
);

-- Snapshot of the discount applied to each booking (survives rule edits/deletes).
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
);
