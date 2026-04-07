const pool = require('./src/db');

const imageUpdates = [
  { id: 25, url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=1000" }, // Vijay Poultary
  { id: 34, url: "https://images.unsplash.com/photo-1607623273573-fb33400f86cb?q=80&w=1000" }, // Elite Meats
  { id: 35, url: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1000" }, // Apex Catering
  { id: 27, url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000" }, // Royal Events
  { id: 28, url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000" }, // Green Earth
  { id: 29, url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000" }, // Focus Studios
  { id: 30, url: "https://images.unsplash.com/photo-1589119908125-900593457591?q=80&w=1000" }, // Sweet Symphony
  { id: 31, url: "https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000" }, // Fusion Band
  { id: 32, url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1000" }, // Fun Works
  { id: 33, url: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?q=80&w=1000" }, // Chef Choice
  { id: 36, url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000" }  // Premium Decor
];

async function updateVendorImages() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    console.log("🚀 Starting vendor image updates...");

    for (const item of imageUpdates) {
      const [result] = await connection.execute(
        "UPDATE Users SET image = ? WHERE user_id = ?",
        [item.url, item.id]
      );
      if (result.affectedRows > 0) {
        console.log(`✅ Updated ID ${item.id} with new image.`);
      } else {
        console.warn(`⚠️ No record found for ID ${item.id}.`);
      }
    }

    await connection.commit();
    console.log("🎊 All updates committed successfully!");
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error updating vendor images:", err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

updateVendorImages();
