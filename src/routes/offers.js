const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all offers for a vendor
router.get('/vendor/:vendor_id', async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const [rows] = await pool.query('SELECT * FROM vendor_offers WHERE vendor_id = ? ORDER BY created_at DESC', [vendor_id]);
        res.json({ status: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Get active offers for a vendor + service (for customer app)
router.get('/active/:vendor_id', async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const { service_id } = req.query;
        let query = 'SELECT * FROM vendor_offers WHERE vendor_id = ? AND is_active = 1 AND (start_date IS NULL OR start_date <= CURDATE()) AND (end_date IS NULL OR end_date >= CURDATE())';
        let params = [vendor_id];

        if (service_id) {
            query += ' AND (service_id IS NULL OR service_id = ?)';
            params.push(service_id);
        }

        const [rows] = await pool.query(query, params);
        res.json({ status: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Add new offer
router.post('/', async (req, res) => {
    try {
        const { vendor_id, service_id, coupon_code, title, description, start_date, end_date, usage_limit_per_user } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO vendor_offers (vendor_id, service_id, coupon_code, title, description, start_date, end_date, usage_limit_per_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [vendor_id, service_id || null, coupon_code, title, description, start_date || null, end_date || null, usage_limit_per_user || 1]
        );

        res.json({ status: true, message: 'Offer added successfully', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Update offer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { service_id, coupon_code, title, description, start_date, end_date, usage_limit_per_user, is_active } = req.body;
        
        await pool.query(
            'UPDATE vendor_offers SET service_id = ?, coupon_code = ?, title = ?, description = ?, start_date = ?, end_date = ?, usage_limit_per_user = ?, is_active = ? WHERE id = ?',
            [service_id || null, coupon_code, title, description, start_date || null, end_date || null, usage_limit_per_user || 1, is_active, id]
        );

        res.json({ status: true, message: 'Offer updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// Delete offer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM vendor_offers WHERE id = ?', [id]);
        res.json({ status: true, message: 'Offer deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

module.exports = router;
