CREATE DEFINER=`u385969042_test_user`@`%` PROCEDURE `CreateBooking`(
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
END