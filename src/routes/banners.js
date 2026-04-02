const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');

// Memory storage for Base64 image
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Test route for router existence
router.get('/health', (req, res) => res.json({ status: true, message: 'Banners router is active' }));

// Get all dynamic banners (global or vendor specific)
router.get('/', async (req, res) => {
    try {
        const { vendor_id, service_id } = req.query;
        let query = 'SELECT * FROM vendor_banners WHERE is_active = 1';
        let params = [];

        if (vendor_id) {
            query += ' AND vendor_id = ?';
            params.push(vendor_id);
        }

        if (service_id) {
            query += ' AND (service_id = ? OR service_id IS NULL)';
            params.push(service_id);
        }

        const [rows] = await pool.query(query, params);
        res.json({ status: true, data: rows });
    } catch (err) {
        console.error('Error fetching banners:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Get banners for a specific vendor (Admin view)
router.get('/vendor/:vendor_id', async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const [rows] = await pool.query('SELECT * FROM vendor_banners WHERE vendor_id = ?', [vendor_id]);
        res.json({ status: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Get a single banner by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM vendor_banners WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ status: false, message: 'Banner not found' });
        res.json({ status: true, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Add new banner
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { vendor_id, service_id, title, description, link_url } = req.body;
        let image_url = null;

        if (req.file) {
            image_url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        const [result] = await pool.query(
            'INSERT INTO vendor_banners (vendor_id, service_id, image_url, title, description, link_url) VALUES (?, ?, ?, ?, ?, ?)',
            [vendor_id, service_id || null, image_url, title, description, link_url]
        );

        res.json({ status: true, message: 'Banner added successfully', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Update banner
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { service_id, title, description, link_url } = req.body;
        
        // Start building query
        let query = 'UPDATE vendor_banners SET service_id = ?, title = ?, description = ?, link_url = ?';
        let params = [service_id || null, title, description, link_url];

        // If a new image is provided, include it in the update
        if (req.file) {
            const image_url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            query += ', image_url = ?';
            params.push(image_url);
        }

        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await pool.query(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: false, message: 'Banner not found' });
        }

        res.json({ status: true, message: 'Banner updated successfully' });
    } catch (err) {
        console.error('Error updating banner:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Delete banner
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM vendor_banners WHERE id = ?', [id]);
        res.json({ status: true, message: 'Banner deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

module.exports = router;
