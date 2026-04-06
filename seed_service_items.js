const mysql = require("mysql2/promise");
require('dotenv').config();

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

const serviceItems = [
  // 1: Function halls
  { service_id: 1, name: "Grand AC Convention Hall", description: "Vast space for 500+ guests, fully air-conditioned with premium lighting.", price: 75000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800" },
  { service_id: 1, name: "Mini AC Banquet Hall", description: "Perfect for birthdays and small functions (up to 100 people).", price: 25000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800" },
  { service_id: 1, name: "Open Garden Lawn", description: "Beautiful outdoor space for evening receptions and parties.", price: 40000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800" },

  // 2: Kirana / grocery
  { service_id: 2, name: "Fine Rice (25kg Bag)", description: "Premium quality Sona Masoori or Basmati rice.", price: 1450, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800" },
  { service_id: 2, name: "Sunflower Cooking Oil (5L Can)", description: "Heart-healthy pure sunflower oil.", price: 650, quantity_type: "liter", image_url: "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?auto=format&fit=crop&q=80&w=800" },
  { service_id: 2, name: "Granulated Sugar (5kg)", description: "Refined white sugar for sweets and beverages.", price: 220, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&q=80&w=800" },

  // 3: Poultry & Mutton
  { service_id: 3, name: "Fresh Broiler Chicken", description: "Farm-fresh, tender broiler chicken, cleaned and cut.", price: 220, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=800" },
  { service_id: 3, name: "Tender Mutton (Chevon)", description: "Premium quality goat meat, tender and juicy.", price: 850, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1603048297172-c92272a2a095?auto=format&fit=crop&q=80&w=800" },
  { service_id: 3, name: "Country Chicken (Natukodi)", description: "High-protein country chicken for authentic taste.", price: 450, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1604152135912-1f728795c479?auto=format&fit=crop&q=80&w=800" },

  // 4: Vegetables & Leafs
  { service_id: 4, name: "Bulk Vegetable Mix", description: "Seasonal assorted vegetables for catering (Onion, Potato, Tomato).", price: 1500, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1566385101042-1a000c1268c4?auto=format&fit=crop&q=80&w=800" },
  { service_id: 4, name: "Fresh Leafy Greens (Assorted)", description: "Spinach, Coriander, Mint, and more.", price: 100, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800" },

  // 5: Tenthouse / cooking Vessels
  { service_id: 5, name: "Luxury Tent Decoration", description: "Premium fabric draping and carpet setup for events.", price: 15000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1510076857177-74700760beaa?auto=format&fit=crop&q=80&w=800" },
  { service_id: 5, name: "Catering Vessel Set", description: "Complete set of large cooking pots, burners, and ladles.", price: 5000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800" },
  { service_id: 5, name: "Premium Plastic Chairs (100 Nos)", description: "Comfortable and sturdy seating with optional covers.", price: 1500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800" },

  // 6: Dairy Products
  { service_id: 6, name: "Full Cream Milk (Bulk)", description: "Pure cow milk for beverages and dairy needs.", price: 65, quantity_type: "liter", image_url: "https://images.unsplash.com/photo-1563636619-e910009355dc?auto=format&fit=crop&q=80&w=800" },
  { service_id: 6, name: "Fresh Malai Paneer", description: "Soft and creamy cottage cheese for starters and gravy.", price: 420, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1594489828775-343346d3c279?auto=format&fit=crop&q=80&w=800" },
  { service_id: 6, name: "Pure Desi Ghee", description: "Aromatic and pure ghee for sweets and cooking.", price: 750, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&q=80&w=800" },

  // 7: Beverage & Refreshment
  { service_id: 7, name: "Assorted Soft Drinks (2L)", description: "Cola, Lime, and Orange flavors.", price: 95, quantity_type: "liter", image_url: "https://images.unsplash.com/photo-1527960669566-f882ba85a4c6?auto=format&fit=crop&q=80&w=800" },
  { service_id: 7, name: "Premium Mineral Water (20L Can)", description: "Purified drinking water with minerals.", price: 50, quantity_type: "liter", image_url: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=800" },
  { service_id: 7, name: "Fresh Fruit Welcome Juice", description: "Seasonal fresh fruit juice served cold.", price: 45, quantity_type: "liter", image_url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800" },

  // 8: Dessert & Sweets
  { service_id: 8, name: "Hot Gulab Jamun (100 Pcs)", description: "Soft milk solids fried and soaked in sugar syrup.", price: 2000, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1589119908125-900593457591?auto=format&fit=crop&q=80&w=800" },
  { service_id: 8, name: "Premium Assorted Sweets Box", description: "Mix of Ladoo, Kaju Katli, and Mysore Pak.", price: 950, quantity_type: "kg", image_url: "https://images.unsplash.com/photo-1589119908679-0583facacc21?auto=format&fit=crop&q=80&w=800" },
  { service_id: 8, name: "Rich Vanilla Ice Cream (Bulk)", description: "Creamy vanilla ice cream for dessert counters.", price: 350, quantity_type: "liter", image_url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=800" },

  // 9: Food Transportation Service
  { service_id: 9, name: "Mini Food Delivery Van", description: "Efficient transport for small and medium food orders.", price: 2500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&q=80&w=800" },
  { service_id: 9, name: "Refrigerated Delivery Truck", description: "Temp-controlled transport for bulk dairy and meat exports.", price: 6000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1519003722824-192d992a6059?auto=format&fit=crop&q=80&w=800" },

  // 10: Outdoor Event Setup
  { service_id: 10, name: "Pagoda Tent Setup", description: "Modern and stylish pagoda tents for food stalls.", price: 4500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800" },
  { service_id: 10, name: "Stage & Lighting Combo", description: "Professional stage setup with LED PAR lights and spots.", price: 12000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800" },
  { service_id: 10, name: "Red Carpet Entrance", description: "VIP red carpet with entrance posts and floral arch.", price: 3500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=800" },

  // 11: Live Music Band
  { service_id: 11, name: "Traditional Brass Band", description: "Vibrant and loud brass band for baraat and processions.", price: 15000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800" },
  { service_id: 11, name: "Live Fusion Music Band", description: "Electric mix of traditional and modern pop songs.", price: 45000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=800" },

  // 12: Wedding Music Ensemble
  { service_id: 12, name: "Shehnai & Dhol Artists", description: "Classic auspicious sounds for wedding entry.", price: 10000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1514320298543-63e245193b66?auto=format&fit=crop&q=80&w=800" },
  { service_id: 12, name: "Sufi Singers Ensemble", description: "Devotional and soulful Sufi music for receptions.", price: 35000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800" },

  // 13: Face Painting Service
  { service_id: 13, name: "Theme Face Painting", description: "Creative face painting for kids (Superheroes, Animals).", price: 3500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1520156555610-6ca563bc7500?auto=format&fit=crop&q=80&w=800" },
  { service_id: 13, name: "Glitter & Glow Paints", description: "Premium glitter face painting for evening parties.", price: 5000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1549417229-aa7d4b46ca03?auto=format&fit=crop&q=80&w=800" },

  // 14: Magician & Illusion Show
  { service_id: 14, name: "Kids Comedy Magic Show", description: "Interactive 45-min magic show with humor and fun.", price: 6500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800" },
  { service_id: 14, name: "Grand Illusionist Performance", description: "Professional stage illusions and psychological magic.", price: 20000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1511216113906-8f57bb83e776?auto=format&fit=crop&q=80&w=800" },

  // 15: Live Entertainer / Joker
  { service_id: 15, name: "Funny Clown & Balloons", description: "Clown with balloon modeling skills to engage kids.", price: 4000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1515233343714-87893a903673?auto=format&fit=crop&q=80&w=800" },
  { service_id: 15, name: "Human Statue Artist", description: "Living statue entertainer for guest attraction.", price: 7500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1517404212738-15263e9f9178?auto=format&fit=crop&q=80&w=800" },

  // 16: Fun Games Coordinator
  { service_id: 16, name: "Professional Event MC/Anchor", description: "High-energy host to coordinate games and announcements.", price: 8500, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=800" },
  { service_id: 16, name: "Carnival Game Stalls (3 Nos)", description: "Ring toss, Balloon shooting, and Hit the cans.", price: 6000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800" },

  // 17: Chocolate Fountain
  { service_id: 17, name: "3-Tier Belgian Choco Fountain", description: "Flowing chocolate with fruits and marshmallows.", price: 8000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&q=80&w=800" },
  { service_id: 17, name: "Large 5-Tier Deluxe Fountain", description: "Premium chocolate fountain with wide variety of dips.", price: 15000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1575033035763-952408986877?auto=format&fit=crop&q=80&w=800" },

  // 18: Instant Photo Booth
  { service_id: 18, name: "Magic Mirror Photo Booth", description: "Interactive mirror with customized photo prints.", price: 12000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800" },
  { service_id: 18, name: "Fun Props Photo Counter", description: "Static photo booth with fun props and digital copies.", price: 5000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800" },

  // 19: Event Photography
  { service_id: 19, name: "Premium Candid Photography", description: "Expert photographers capturing natural moments.", price: 35000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&q=80&w=800" },
  { service_id: 19, name: "4K Cinematic Videography", description: "Cinematic movie-style coverage of your entire event.", price: 55000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=800" },
  { service_id: 19, name: "Drone Aerial Coverage", description: "Professional 4K drone shots for outdoor event views.", price: 12000, quantity_type: "day", image_url: "https://images.unsplash.com/photo-1473968512647-3e44a224fe8f?auto=format&fit=crop&q=80&w=800" },
];

async function seedData() {
  const connection = await pool.getConnection();
  try {
    console.log("Connected to database...");

    // Optional: Truncate current items if you want a clean start, but user said "add into table more"
    // await connection.execute("TRUNCATE TABLE service_items");

    for (const item of serviceItems) {
      console.log(`Inserting: ${item.name} for Service ID: ${item.service_id}`);
      await connection.execute(
        "INSERT INTO service_items (service_id, name, description, quantity_type, price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [item.service_id, item.name, item.description, item.quantity_type, item.price, 'active', item.image_url]
      );
    }

    console.log("\x1b[32m%s\x1b[0m", "Successfully seeded " + serviceItems.length + " service items!");
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Seeding failed:", error.message);
  } finally {
    connection.release();
    process.exit();
  }
}

seedData();
