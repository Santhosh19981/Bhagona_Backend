const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /vendor-accounts/list/:vendorId - List all accounts for a vendor
router.get('/list/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM vendor_bank_accounts WHERE vendor_user_id = ? ORDER BY is_default DESC, created_at DESC',
            [vendorId]
        );
        res.json({ status: true, data: rows });
    } catch (err) {
        console.error('Error fetching vendor accounts:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// POST /vendor-accounts/add - Add a new bank account
router.post('/add', async (req, res) => {
    try {
        const { vendor_user_id, bank_name, account_holder_name, account_number, ifsc_code, is_default } = req.body;

        if (!vendor_user_id || !bank_name || !account_number || !ifsc_code) {
            return res.status(400).json({ status: false, message: 'Missing required fields' });
        }

        // If this is the first account, make it default regardless of is_default flag
        const [existing] = await db.query('SELECT count(*) as count FROM vendor_bank_accounts WHERE vendor_user_id = ?', [vendor_user_id]);
        const setAsDefault = existing[0].count === 0 ? true : is_default;

        // If new account is default, unset previous default
        if (setAsDefault) {
            await db.query('UPDATE vendor_bank_accounts SET is_default = FALSE WHERE vendor_user_id = ?', [vendor_user_id]);
        }

        const [result] = await db.query(
            'INSERT INTO vendor_bank_accounts (vendor_user_id, bank_name, account_holder_name, account_number, ifsc_code, is_default) VALUES (?, ?, ?, ?, ?, ?)',
            [vendor_user_id, bank_name, account_holder_name, account_number, ifsc_code, setAsDefault]
        );

        res.json({ status: true, message: 'Account added successfully', id: result.insertId });
    } catch (err) {
        console.error('Error adding vendor account:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// PUT /vendor-accounts/set-default/:accountId - Set an account as default
router.put('/set-default/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { vendor_user_id } = req.body;

        if (!vendor_user_id) {
            return res.status(400).json({ status: false, message: 'Vendor User ID is required' });
        }

        // Transactions would be better here, but simple update works for this scale
        await db.query('UPDATE vendor_bank_accounts SET is_default = FALSE WHERE vendor_user_id = ?', [vendor_user_id]);
        await db.query('UPDATE vendor_bank_accounts SET is_default = TRUE WHERE account_id = ?', [accountId]);

        res.json({ status: true, message: 'Default account updated successfully' });
    } catch (err) {
        console.error('Error setting default account:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// PUT /vendor-accounts/update/:accountId - Update bank account details
router.put('/update/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { bank_name, account_holder_name, account_number, ifsc_code } = req.body;

        if (!bank_name || !account_number || !ifsc_code) {
            return res.status(400).json({ status: false, message: 'Missing required fields' });
        }

        await db.query(
            'UPDATE vendor_bank_accounts SET bank_name = ?, account_holder_name = ?, account_number = ?, ifsc_code = ? WHERE account_id = ?',
            [bank_name, account_holder_name, account_number, ifsc_code, accountId]
        );

        res.json({ status: true, message: 'Account updated successfully' });
    } catch (err) {
        console.error('Error updating vendor account:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

// DELETE /vendor-accounts/delete/:accountId - Delete a bank account
router.delete('/delete/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;

        // Check if it's the default account
        const [account] = await db.query('SELECT is_default, vendor_user_id FROM vendor_bank_accounts WHERE account_id = ?', [accountId]);
        
        if (!account.length) {
            return res.status(404).json({ status: false, message: 'Account not found' });
        }

        await db.query('DELETE FROM vendor_bank_accounts WHERE account_id = ?', [accountId]);

        // If we deleted the default and others exist, make the latest one default
        if (account[0].is_default) {
            const [latest] = await db.query('SELECT account_id FROM vendor_bank_accounts WHERE vendor_user_id = ? ORDER BY created_at DESC LIMIT 1', [account[0].vendor_user_id]);
            if (latest.length) {
                await db.query('UPDATE vendor_bank_accounts SET is_default = TRUE WHERE account_id = ?', [latest[0].account_id]);
            }
        }

        res.json({ status: true, message: 'Account deleted successfully' });
    } catch (err) {
        console.error('Error deleting account:', err);
        res.status(500).json({ status: false, message: 'Database error' });
    }
});

module.exports = router;
