const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');

// Memory storage — store as Base64 (same pattern used across all routes)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// ── CREATE TABLE IF NOT EXISTS (run once on startup) ──────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_completion_proofs (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      order_id     VARCHAR(50) NOT NULL,
      image_base64 LONGTEXT    NOT NULL,
      caption      VARCHAR(255) DEFAULT NULL,
      uploaded_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_id (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
ensureTable().catch(console.error);

// ── GET  /api/order-proofs/:orderId ── fetch all proof images for an order ────
router.get('/:orderId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, image_base64, caption, uploaded_at FROM order_completion_proofs WHERE order_id = ? ORDER BY uploaded_at ASC',
      [req.params.orderId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching proofs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/order-proofs/:orderId/upload ── upload up to 10 images at once ──
router.post('/:orderId/upload', upload.array('images', 10), async (req, res) => {
  const { orderId } = req.params;
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }
  try {
    for (const file of req.files) {
      const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      await pool.query(
        'INSERT INTO order_completion_proofs (order_id, image_base64, caption) VALUES (?, ?, ?)',
        [orderId, base64, req.body.caption || null]
      );
    }
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM order_completion_proofs WHERE order_id = ?',
      [orderId]
    );
    res.json({ success: true, total: rows[0].total });
  } catch (err) {
    console.error('Error uploading proofs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/order-proofs/:orderId/:proofId ── remove a single image ───────
router.delete('/:orderId/:proofId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM order_completion_proofs WHERE id = ? AND order_id = ?',
      [req.params.proofId, req.params.orderId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting proof:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/order-proofs/:orderId/count ── check how many images are uploaded ─
router.get('/:orderId/count', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM order_completion_proofs WHERE order_id = ?',
      [req.params.orderId]
    );
    res.json({ success: true, total: rows[0].total });
  } catch (err) {
    console.error('Error counting proofs:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
