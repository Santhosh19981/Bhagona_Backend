const express = require('express');
const router = express.Router();
const db = require('../db'); // promise pool
const multer = require('multer');
const path = require('path');

// Multer config for Base64 (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('📥 req.body:', JSON.stringify(req.body, null, 2));
    console.log('📥 req.file:', req.file ? `File present: ${req.file.originalname}` : 'No file');

    const {
      fullName,
      email,
      mobile,
      password,
      age,
      experience,
      address,
      declaration,
      cookingStyle,
      services,
      businessName,
      role
    } = req.body;

    const isapproved = 0;
    const isactive = 0;

    // ✅ Common field validation
    if (!fullName?.trim()) return res.status(400).json({ message: 'Full name is required' });
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });
    if (!mobile?.trim()) return res.status(400).json({ message: 'Mobile is required' });
    if (!address?.trim()) return res.status(400).json({ message: 'Address is required' });

    // ✅ Password validation
    if (!password?.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (password.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // ✅ Check if email or mobile already exists
    const [existing] = await db.query(
      'SELECT * FROM Users WHERE email = ? OR mobile = ?',
      [email.trim(), mobile.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email or Mobile already registered' });
    }

    // ✅ Handle image
    const imageBase64 = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : null;

    let insertQuery = '';
    let values = [];

    // ✅ Role 2 = Chef
    if (Number(role) === 2) {
      if (!age || !experience) {
        return res.status(400).json({ message: 'Age and Experience are required for Chef' });
      }

      insertQuery = `
        INSERT INTO Users 
        (name, email, mobile, password, age, experience, address, cookingstyle, \`describe\`, role, isapproved, isactive, image, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      values = [
        fullName.trim(),
        email.trim(),
        mobile.trim(),
        password.trim(),
        age,
        experience,
        address.trim(),
        Array.isArray(cookingStyle) ? cookingStyle.join(', ') : cookingStyle || '',
        declaration || '',
        role,
        isapproved,
        isactive,
        imageBase64,
        4 // Default rating
      ];
    }

    // ✅ Role 3 = Vendor
    else if (Number(role) === 3) {
      if (!businessName?.trim() || !services?.length) {
        return res.status(400).json({ message: 'Business name and Services are required for Vendor' });
      }

      insertQuery = `
        INSERT INTO Users 
        (name, email, mobile, password, experience, address, \`describe\`, services, role, isapproved, isactive, businessname, image, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      values = [
        fullName.trim(),
        email.trim(),
        mobile.trim(),
        password.trim(),
        experience || 0,
        address.trim(),
        declaration || '',
        Array.isArray(services) ? services.join(', ') : services || '',
        role,
        isapproved,
        isactive,
        businessName.trim(),
        imageBase64,
        4 // Default rating
      ];
    }

    else {
      return res.status(400).json({ message: 'Invalid role type' });
    }

    const [result] = await db.query(insertQuery, values);

    return res.status(200).json({
      message: Number(role) === 2 ? 'Chef registered successfully' : 'Vendor registered successfully',
      userId: result.insertId
    });

  } catch (err) {
    console.error('Error in /addUser:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
