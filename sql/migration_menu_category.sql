-- STEP 1: Run this part first to create the subcategory table
CREATE TABLE IF NOT EXISTS menu_subcategory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    image LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- STEP 2: Run this part to create the mapping table
CREATE TABLE IF NOT EXISTS menu_category_subcategory_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES menu_category(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES menu_subcategory(id) ON DELETE CASCADE
);

-- STEP 3: Run this part to add columns to menu_items
-- NOTE: If this fails, try removing 'IF NOT EXISTS'
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS veg TINYINT(1) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS nonveg TINYINT(1) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS menu_category_id INT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS menu_subcategory_id INT;
ALTER TABLE menu_items MODIFY COLUMN image_url LONGTEXT;
