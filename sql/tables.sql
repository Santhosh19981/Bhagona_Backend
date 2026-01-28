-- Inferred tables (adjust if necessary)
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT,
  phone VARCHAR(50),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(512),
  status VARCHAR(50) DEFAULT 'active',
  event_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menus (
  menu_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT,
  name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
  menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
  menu_id INT,
  name VARCHAR(255),
  description TEXT,
  image_url LONGTEXT,
  price DECIMAL(10,2) DEFAULT 0,
  veg TINYINT(1) DEFAULT 0,
  nonveg TINYINT(1) DEFAULT 0,
  menu_category_id INT,
  menu_subcategory_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    image LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_subcategory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    image LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_category_subcategory_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES menu_category(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES menu_subcategory(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_user_id INT,
  event_id INT,
  service_id INT,
  event_date DATETIME,
  total_members INT DEFAULT 0,
  veg_guests INT DEFAULT 0,
  non_veg_guests INT DEFAULT 0,
  booking_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  menu_item_id INT,
  quantity INT DEFAULT 1,
  price DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chef_availabilities (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  chef_user_id INT,
  available_date DATE,
  start_time TIME,
  end_time TIME,
  is_available TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chef_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  primary_chef_user_id INT,
  alternate_chef1_user_id INT,
  alternate_chef2_user_id INT
);

CREATE TABLE IF NOT EXISTS chef_order_acceptance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  chef_user_id INT,
  acceptance_status VARCHAR(50) DEFAULT 'pending',
  decision_time DATETIME,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  vendor_profile_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  service_name VARCHAR(255),
  cuisine_type VARCHAR(255),
  price_per_plate DECIMAL(10,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_bookings (
  booking_id INT PRIMARY KEY,
  primary_vendor_user_id INT,
  alternate_vendor1_user_id INT,
  alternate_vendor2_user_id INT
);

CREATE TABLE IF NOT EXISTS vendor_order_acceptance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  vendor_user_id INT,
  acceptance_status VARCHAR(50) DEFAULT 'pending',
  decision_time DATETIME,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chef_profiles (
  chef_profile_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  experience_years INT DEFAULT 0,
  specialties VARCHAR(512),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  order_value DECIMAL(12,2) DEFAULT 0,
  payment_status VARCHAR(50),
  payment_method VARCHAR(100),
  transaction_id VARCHAR(255),
  payment_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments_history (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  amount DECIMAL(12,2) DEFAULT 0,
  transaction_type VARCHAR(50),
  transaction_date DATETIME,
  description TEXT,
  review_id INT,
  booking_id INT,
  customer_user_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  customer_user_id INT,
  hygiene_rating TINYINT,
  food_taste_rating TINYINT,
  chef_behavior_rating TINYINT,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  service_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  unit_id INT,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  unit_id INT AUTO_INCREMENT PRIMARY KEY,
  unit_name VARCHAR(100),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS serviceitems (
  service_item_id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT,
  name VARCHAR(255),
  description TEXT,
  quantity_type VARCHAR(100),
  price DECIMAL(10,2),
  image_url VARCHAR(512),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS=1;
