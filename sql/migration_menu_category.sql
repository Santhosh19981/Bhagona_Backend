-- Migration script to fix missing menu category/subcategory tables

-- 1. Create menu_category table
CREATE TABLE IF NOT EXISTS menu_category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    image LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Create menu_subcategory table
CREATE TABLE IF NOT EXISTS menu_subcategory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    image LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Create mapping table
CREATE TABLE IF NOT EXISTS menu_category_subcategory_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES menu_category(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES menu_subcategory(id) ON DELETE CASCADE
);

-- 4. Update menu_items table
-- First, rename menuitems to menu_items if it hasn't been renamed already
-- RENAME TABLE menuitems TO menu_items;

-- Add missing columns to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS veg TINYINT(1) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS nonveg TINYINT(1) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS menu_category_id INT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS menu_subcategory_id INT;

-- Increase image_url length to support Base64 images if needed
ALTER TABLE menu_items MODIFY COLUMN image_url LONGTEXT;
