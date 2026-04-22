const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateProcedure() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    console.log('Connected to database...');

    const dropSql = `DROP PROCEDURE IF EXISTS CreateBooking;`;
    
    const createSql = `
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

      -- Only insert into chef tables if it's a chef/catering booking and chef ID is provided
      IF (p_booking_type = 'chef_booking' OR p_booking_type = 'catering_booking') AND p_primary_chef_user_id IS NOT NULL THEN
        INSERT INTO chef_bookings (booking_id, primary_chef_user_id, alternate_chef1_user_id, alternate_chef2_user_id)
          VALUES (p_booking_id, p_primary_chef_user_id, p_alternate_chef1_user_id, p_alternate_chef2_user_id);

        INSERT INTO chef_order_acceptance (booking_id, chef_user_id) VALUES (p_booking_id, p_primary_chef_user_id);
        IF p_alternate_chef1_user_id IS NOT NULL THEN
          INSERT INTO chef_order_acceptance (booking_id, chef_user_id) VALUES (p_booking_id, p_alternate_chef1_user_id);
        END IF;
        IF p_alternate_chef2_user_id IS NOT NULL THEN
          INSERT INTO chef_order_acceptance (booking_id, chef_user_id) VALUES (p_booking_id, p_alternate_chef2_user_id);
        END IF;
      END IF;

      -- Only insert into vendor tables if vendor ID is provided
      IF p_primary_vendor_user_id IS NOT NULL THEN
        INSERT INTO vendor_bookings (booking_id, primary_vendor_user_id, alternate_vendor1_user_id, alternate_vendor2_user_id)
          VALUES (p_booking_id, p_primary_vendor_user_id, p_alternate_vendor1_user_id, p_alternate_vendor2_user_id);

        INSERT INTO vendor_order_acceptance (booking_id, vendor_user_id) VALUES (p_booking_id, p_primary_vendor_user_id);
        IF p_alternate_vendor1_user_id IS NOT NULL THEN
          INSERT INTO vendor_order_acceptance (booking_id, vendor_user_id) VALUES (p_booking_id, p_alternate_vendor1_user_id);
        END IF;
        IF p_alternate_vendor2_user_id IS NOT NULL THEN
          INSERT INTO vendor_order_acceptance (booking_id, vendor_user_id) VALUES (p_booking_id, p_alternate_vendor2_user_id);
        END IF;
      END IF;

      COMMIT;
    END;
    `;

    try {
        await connection.query(dropSql);
        await connection.query(createSql);
        console.log('Procedure CreateBooking updated successfully with null-safety.');
    } catch (err) {
        console.error('Error updating procedure:', err);
    } finally {
        await connection.end();
    }
}

updateProcedure();
