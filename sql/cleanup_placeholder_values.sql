-- Cleanup of placeholder strings ("undefined" / "null" / "NaN") saved by older forms.
-- Safe to run multiple times. Review the SELECT counts first, then run the UPDATEs.
-- Run separately on bhagona_qa and bhagona_prod.

-- 1) Preview
SELECT 'menu_subcategory.image' AS col, COUNT(*) AS n FROM menu_subcategory WHERE TRIM(image) IN ('undefined','null','NaN')
UNION ALL SELECT 'menu_category.image', COUNT(*) FROM menu_category WHERE TRIM(image) IN ('undefined','null','NaN')
UNION ALL SELECT 'menu_items.image_url', COUNT(*) FROM menu_items WHERE TRIM(image_url) IN ('undefined','null','NaN')
UNION ALL SELECT 'events.image_url', COUNT(*) FROM events WHERE TRIM(image_url) IN ('undefined','null','NaN')
UNION ALL SELECT 'services.image_data', COUNT(*) FROM services WHERE TRIM(image_data) IN ('undefined','null','NaN')
UNION ALL SELECT 'service_items.image_url', COUNT(*) FROM service_items WHERE TRIM(image_url) IN ('undefined','null','NaN')
UNION ALL SELECT 'Users.image', COUNT(*) FROM Users WHERE TRIM(image) IN ('undefined','null','NaN');

-- 2) Fix (image columns -> NULL so apps show their default image)
UPDATE menu_subcategory SET image = NULL WHERE TRIM(image) IN ('undefined','null','NaN');
UPDATE menu_category   SET image = NULL WHERE TRIM(image) IN ('undefined','null','NaN');
UPDATE menu_items      SET image_url = NULL WHERE TRIM(image_url) IN ('undefined','null','NaN');
UPDATE events          SET image_url = NULL WHERE TRIM(image_url) IN ('undefined','null','NaN');
UPDATE services        SET image_data = NULL WHERE TRIM(image_data) IN ('undefined','null','NaN');
UPDATE service_items   SET image_url = NULL WHERE TRIM(image_url) IN ('undefined','null','NaN');
UPDATE Users           SET image = NULL WHERE TRIM(image) IN ('undefined','null','NaN');
