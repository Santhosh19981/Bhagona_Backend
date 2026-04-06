const mysql = require("mysql2/promise");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bhagona_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper to convert local image to base64
function getBase64(file) {
  try {
    const bitmap = fs.readFileSync(file);
    return `data:image/png;base64,${Buffer.from(bitmap).toString('base64')}`;
  } catch (e) {
    return null;
  }
}

// 🟢 PROFESSIONAL VENDOR PROFILES
const vendors = [
  { name: "Royal Events & Convention", email: "royal@bhagona.com", business: "Royal Events", mobile: "9000000001", services: "1,10", description: "Premier event space and outdoor staging specialists with 10+ years experience." },
  { name: "Green Earth Groceries", email: "green@bhagona.com", business: "Green Earth", mobile: "9000000002", services: "2,4,6", description: "Farm-fresh kirana, vegetables, and dairy products delivered direct to your venue." },
  { name: "Focus Photography Hub", email: "focus@bhagona.com", business: "Focus Studios", mobile: "9000000003", services: "18,19", description: "Capturing candid moments and cinematic memories with state-of-the-art equipment." },
  { name: "Sweet Symphony", email: "sweets@bhagona.com", business: "Sweet Symphony", mobile: "9000000004", services: "7,8,17", description: "Gourmet desserts, chocolate fountains, and refreshing mocktail counters." },
  { name: "Fusion Music Band", email: "music@bhagona.com", business: "Fusion Band", mobile: "9000000005", services: "11,12", description: "Soulful live music and traditional ensembles to elevate your celebration." },
  { name: "Kids Fun Entertainment", email: "fun@bhagona.com", business: "Fun Works", mobile: "9000000006", services: "13,14,15,16", description: "Full-scale entertainment including magicians, jokers, and fun game stalls." },
  { name: "Chef's Choice Logistics", email: "logistics@bhagona.com", business: "Chef Choice", mobile: "9000000007", services: "9,5", description: "Efficient food transportation and premium tenthouse equipment rentals." },
  { name: "Elite Meat & Poultry", email: "elite@bhagona.com", business: "Elite Meats", mobile: "9000000008", services: "3,6", description: "High-quality poultry, mutton, and fresh dairy products for large gatherings." },
  { name: "Apex Catering Services", email: "apex@bhagona.com", business: "Apex Catering", mobile: "9000000009", services: "2,3,4,6", description: "End-to-end grocery and perishables supply for professional catering teams." },
  { name: "Bhagona Premium Decor", email: "decor@bhagona.com", business: "Premium Decor", mobile: "9000000010", services: "1,5,10", description: "Stunning decor solutions for function halls and outdoor event setups." },
];

// Mapping for service items to fix images (using high-quality placeholders for variety)
const categoryPlaceholderImages = {
  1: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800", // Hall
  2: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", // Grocery
  3: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800", // Poultry
  4: "https://images.unsplash.com/photo-1566385101042-1a000c1268c4?w=800", // Veg
  5: "https://images.unsplash.com/photo-1510076857177-74700760beaa?w=800", // Tent
  6: "https://images.unsplash.com/photo-1563636619-e910009355dc?w=800", // Dairy
  7: "https://images.unsplash.com/photo-1527960669566-f882ba85a4c6?w=800", // Bev
  8: "https://images.unsplash.com/photo-1589119908125-900593457591?w=800", // Sweet
  9: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=800", // Trans
  10: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", // Outdoor
  11: "https://images.unsplash.com/photo-1459749411177-042180ce673c?w=800", // Band
  12: "https://images.unsplash.com/photo-1514320298543-63e245193b66?w=800", // Music
  13: "https://images.unsplash.com/photo-1520156555610-6ca563bc7500?w=800", // Face
  14: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800", // Magic
  15: "https://images.unsplash.com/photo-1515233343714-87893a903673?w=800", // Joker
  16: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800", // Games
  17: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=800", // Choco
  18: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", // Photo
  19: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800", // Photo
};

async function seedMegaData() {
  const connection = await pool.getConnection();
  try {
    console.log("🚀 Starting Mega Data Seeding...");

    // 1. Create Vendors
    for (const v of vendors) {
      console.log(`👤 Creating Vendor: ${v.name}`);
      const [userRes] = await connection.execute(
        "INSERT INTO Users (name, email, password, role, mobile, businessname, \`describe\`, services, isapproved, isactive, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [v.name, v.email, '1234', 'vendor', v.mobile, v.business, v.description, v.services, 1, 1, 4.5]
      );
      const userId = userRes.insertId;

      // Map Services
      const serviceIds = v.services.split(',');
      for (const sid of serviceIds) {
        await connection.execute(
          "INSERT INTO vendor_service_mappings (vendor_id, service_id) VALUES (?, ?)",
          [userId, sid]
        );

        // Assign top 3 items from this service to vendor
        const [items] = await connection.execute(
          "SELECT service_item_id FROM service_items WHERE service_id = ? LIMIT 3",
          [sid]
        );
        for (const item of items) {
          await connection.execute(
            "INSERT IGNORE INTO vendor_item_mappings (vendor_id, service_item_id) VALUES (?, ?)",
            [userId, item.service_item_id]
          );
        }
      }
    }

    // 2. Fix All Service Item Images
    console.log("🖼️ Fixing invalid images in service_items...");
    const [itemsToFix] = await connection.execute("SELECT service_item_id, service_id, name FROM service_items");
    for (const item of itemsToFix) {
      const placeholder = categoryPlaceholderImages[item.service_id] || "https://images.unsplash.com/photo-1528698855410-8ef5f8373307?w=800";
      await connection.execute(
        "UPDATE service_items SET image_url = ? WHERE service_item_id = ?",
        [placeholder, item.service_item_id]
      );
    }

    console.log("\x1b[32m%s\x1b[0m", "✅ Mega Seeding Complete!");
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Mega Seeding failed:", error.message);
  } finally {
    connection.release();
    process.exit();
  }
}

seedMegaData();
