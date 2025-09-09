-- Stored procedures provided by user (cleaned up where necessary).
DELIMITER $$

CREATE PROCEDURE AddChefAvailability(
  IN p_chef_user_id INT,
  IN p_date DATE,
  IN p_start TIME,
  IN p_end TIME
)
BEGIN
  INSERT INTO chef_availabilities (chef_user_id, available_date, start_time, end_time, is_available)
  VALUES (p_chef_user_id, p_date, p_start, p_end, TRUE);
END$$

CREATE PROCEDURE AddMenuItemToBooking(
  IN p_booking_id INT,
  IN p_menu_item_id INT,
  IN p_quantity INT,
  IN p_price DECIMAL(10,2)
)
BEGIN
  INSERT INTO booking_menu_items (booking_id, menu_item_id, quantity, price)
  VALUES (p_booking_id, p_menu_item_id, p_quantity, p_price);
END$$

CREATE PROCEDURE AddReview(
  IN p_booking_id INT,
  IN p_customer_user_id INT,
  IN p_hygiene TINYINT,
  IN p_food_taste TINYINT,
  IN p_chef_behavior TINYINT,
  IN p_comments TEXT
)
BEGIN
  INSERT INTO reviews (
    booking_id, customer_user_id, hygiene_rating,
    food_taste_rating, chef_behavior_rating, comments, created_at
  )
  VALUES (
    p_booking_id, p_customer_user_id, p_hygiene,
    p_food_taste, p_chef_behavior, p_comments, NOW()
  );
END$$

CREATE PROCEDURE AddUser(
  IN p_role_name VARCHAR(50),
  IN p_full_name VARCHAR(100),
  IN p_email VARCHAR(100),
  IN p_password_hash VARCHAR(255),
  IN p_phone VARCHAR(20),
  IN p_address TEXT,
  OUT p_user_id INT
)
BEGIN
  DECLARE v_role_id INT;
  SELECT role_id INTO v_role_id FROM roles WHERE role_name = p_role_name LIMIT 1;
  IF v_role_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role not found';
  END IF;

  INSERT INTO users (role_id, full_name, email, password_hash, phone, address, status)
  VALUES (v_role_id, p_full_name, p_email, p_password_hash, p_phone, p_address,
    CASE WHEN p_role_name IN ('customer','admin') THEN 'active' ELSE 'pending' END);

  SET p_user_id = LAST_INSERT_ID();

  IF p_role_name = 'chef' THEN
    INSERT INTO chef_profiles (user_id, experience_years, specialties) VALUES (p_user_id, 0, '');
  ELSEIF p_role_name = 'vendor' THEN
    INSERT INTO vendor_profiles (user_id, service_name, cuisine_type, price_per_plate) VALUES (p_user_id, '', '', 0.0);
  ELSEIF p_role_name = 'admin' THEN
    INSERT INTO admin_profiles (user_id, role) VALUES (p_user_id, 'admin');
  END IF;
END$$

CREATE PROCEDURE CreateBooking(
  IN p_customer_user_id INT,
  IN p_event_id INT,
  IN p_service_id INT,
  IN p_event_date DATE,
  IN p_total_members INT,
  IN p_veg_guests INT,
  IN p_non_veg_guests INT,
  IN p_booking_type ENUM('chef_booking','catering_booking','service_booking'),
  IN p_primary_chef_user_id INT,
  IN p_alternate_chef1_user_id INT,
  IN p_alternate_chef2_user_id INT,
  IN p_primary_vendor_user_id INT,
  IN p_alternate_vendor1_user_id INT,
  IN p_alternate_vendor2_user_id INT,
  OUT p_booking_id INT
)
BEGIN
  START TRANSACTION;

  INSERT INTO bookings (customer_user_id, event_id, service_id, event_date, total_members, veg_guests, non_veg_guests, booking_type, status)
    VALUES (p_customer_user_id, p_event_id, p_service_id, p_event_date, p_total_members, p_veg_guests, p_non_veg_guests, p_booking_type, 'upcoming');

  SET p_booking_id = LAST_INSERT_ID();

  INSERT INTO chef_bookings (booking_id, primary_chef_user_id, alternate_chef1_user_id, alternate_chef2_user_id)
    VALUES (p_booking_id, p_primary_chef_user_id, p_alternate_chef1_user_id, p_alternate_chef2_user_id);

  INSERT INTO vendor_bookings (booking_id, primary_vendor_user_id, alternate_vendor1_user_id, alternate_vendor2_user_id)
    VALUES (p_booking_id, p_primary_vendor_user_id, p_alternate_vendor1_user_id, p_alternate_vendor2_user_id);

  INSERT INTO chef_order_acceptance (booking_id, chef_user_id) VALUES (p_booking_id, p_primary_chef_user_id);
  IF p_alternate_chef1_user_id IS NOT NULL THEN
    INSERT INTO chef_order_acceptance (booking_id, chef_user_id) VALUES (p_booking_id, p_alternate_chef1_user_id);
  END IF;
  IF p_alternate_chef2_user_id IS NOT NULL THEN
    INSERT INTO chef_order_acceptance (booking_id, chef_user_id) VALUES (p_booking_id, p_alternate_chef2_user_id);
  END IF;

  INSERT INTO vendor_order_acceptance (booking_id, vendor_user_id) VALUES (p_booking_id, p_primary_vendor_user_id);
  IF p_alternate_vendor1_user_id IS NOT NULL THEN
    INSERT INTO vendor_order_acceptance (booking_id, vendor_user_id) VALUES (p_booking_id, p_alternate_vendor1_user_id);
  END IF;
  IF p_alternate_vendor2_user_id IS NOT NULL THEN
    INSERT INTO vendor_order_acceptance (booking_id, vendor_user_id) VALUES (p_booking_id, p_alternate_vendor2_user_id);
  END IF;

  COMMIT;
END$$

CREATE PROCEDURE GetAllActiveChefs()
BEGIN
  SELECT u.user_id, u.full_name, u.email, u.phone, cp.experience_years, cp.specialties
  FROM users u
  JOIN roles r ON u.role_id = r.role_id
  LEFT JOIN chef_profiles cp ON u.user_id = cp.user_id
  WHERE r.role_name = 'chef' AND u.status = 'active'
  ORDER BY u.full_name;
END$$

CREATE PROCEDURE GetAllActiveVendors()
BEGIN
  SELECT u.user_id, u.full_name, u.email, u.phone, vp.service_name, vp.cuisine_type, vp.price_per_plate
  FROM users u
  JOIN roles r ON u.role_id = r.role_id
  LEFT JOIN vendor_profiles vp ON u.user_id = vp.user_id
  WHERE r.role_name = 'vendor' AND u.status = 'active'
  ORDER BY u.full_name;
END$$

CREATE PROCEDURE GetAllEvents()
BEGIN
  SELECT event_id, name AS event_name, description, image_url, status FROM events ORDER BY name;
END$$

CREATE PROCEDURE GetAllServices()
BEGIN
  SELECT service_id, name AS service_name, description FROM services;
END$$

CREATE PROCEDURE GetAllUsers()
BEGIN
  SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.status
  FROM users u
  JOIN roles r ON u.role_id = r.role_id
  WHERE u.status = 'active'
  ORDER BY u.full_name;
END$$

CREATE PROCEDURE GetCateringVendors()
BEGIN
  SELECT u.user_id, u.full_name, u.email, u.phone, vp.service_name, vp.cuisine_type, vp.price_per_plate
  FROM users u
  JOIN roles r ON u.role_id = r.role_id
  LEFT JOIN vendor_profiles vp ON u.user_id = vp.user_id
  WHERE r.role_name = 'vendor' AND vp.service_name LIKE '%catering%' AND u.status = 'active'
  ORDER BY u.full_name;
END$$

CREATE PROCEDURE GetChefAvailability(
  IN p_chef_user_id INT,
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT availability_id, available_date, start_time, end_time, is_available
  FROM chef_availabilities
  WHERE chef_user_id = p_chef_user_id AND available_date BETWEEN p_from_date AND p_to_date
  ORDER BY available_date, start_time;
END$$

CREATE PROCEDURE GetOrdersCancelledByRole(IN p_role VARCHAR(20))
BEGIN
  SELECT o.order_id, b.booking_id, b.customer_user_id, b.status AS booking_status, o.order_value, ph.amount, ph.transaction_type, ph.transaction_date, ph.description
  FROM orders o
  JOIN bookings b ON o.booking_id = b.booking_id
  JOIN payments_history ph ON ph.user_id = b.customer_user_id
  WHERE b.status = 'cancelled' AND ph.description LIKE CONCAT('%', p_role, ' cancelled%')
  ORDER BY o.created_at DESC;
END$$

CREATE PROCEDURE GetOrdersStatusSummary()
BEGIN
  SELECT status, COUNT(*) AS total_orders FROM bookings GROUP BY status;
END$$

CREATE PROCEDURE GetServicesWithUnit()
BEGIN
  SELECT s.service_id, s.name AS service_name, s.description, s.price, u.unit_name AS unit_of_measure
  FROM services s
  LEFT JOIN units u ON s.unit_id = u.unit_id
  ORDER BY s.name;
END$$

CREATE PROCEDURE RespondToBooking(
  IN p_booking_id INT,
  IN p_user_id INT,
  IN p_role ENUM('chef','vendor'),
  IN p_acceptance_status ENUM('accepted','rejected'),
  IN p_comments TEXT
)
BEGIN
  IF p_role = 'chef' THEN
    UPDATE chef_order_acceptance SET acceptance_status = p_acceptance_status, decision_time = NOW(), comments = p_comments WHERE booking_id = p_booking_id AND chef_user_id = p_user_id;
  ELSEIF p_role = 'vendor' THEN
    UPDATE vendor_order_acceptance SET acceptance_status = p_acceptance_status, decision_time = NOW(), comments = p_comments WHERE booking_id = p_booking_id AND vendor_user_id = p_user_id;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid role specified';
  END IF;
END$$

CREATE PROCEDURE UpdateUser(
  IN p_user_id INT,
  IN p_full_name VARCHAR(100),
  IN p_phone VARCHAR(20),
  IN p_address TEXT,
  IN p_status ENUM('active','inactive','pending','approved','rejected')
)
BEGIN
  UPDATE users SET full_name = p_full_name, phone = p_phone, address = p_address, status = p_status, updated_at = NOW() WHERE user_id = p_user_id;
END$$

DELIMITER ;
