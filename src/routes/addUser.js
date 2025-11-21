const express = require('express');
const router = express.Router();
const db = require('../db'); // promise pool

router.post('/', async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
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
    if (!fullName?.trim() || !email?.trim() || !mobile?.trim() || !address?.trim()) {
      return res.status(400).json({ message: 'Full name, Email, Mobile, and Address are required' });
    }

    // ✅ Check if email or mobile already exists
    const [existing] = await db.query(
      'SELECT * FROM Users WHERE email = ? OR mobile = ?',
      [email.trim(), mobile.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email or Mobile already registered' });
    }

    let insertQuery = '';
    let values = [];

    // ✅ Role 2 = Chef
    if (role === 2) {
      if (!age || !experience) {
        return res.status(400).json({ message: 'Age and Experience are required for Chef' });
      }

      insertQuery = `
        INSERT INTO Users 
        (name, email, mobile, age, experience, address, cookingstyle, \`describe\`, role, isapproved, isactive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      values = [
        fullName.trim(),
        email.trim(),
        mobile.trim(),
        age,
        experience,
        address.trim(),
        Array.isArray(cookingStyle) ? cookingStyle.join(', ') : cookingStyle || '',
        declaration || '',
        role,
        isapproved,
        isactive
      ];
    }

    // ✅ Role 3 = Vendor
    else if (role === 3) {
      if (!businessName?.trim() || !services?.length) {
        return res.status(400).json({ message: 'Business name and Services are required for Vendor' });
      }

      insertQuery = `
        INSERT INTO Users 
        (name, email, mobile, experience, address, \`describe\`, services, role, isapproved, isactive, businessname)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      values = [
        fullName.trim(),
        email.trim(),
        mobile.trim(),
        experience || 0,
        address.trim(),
        declaration || '',
        Array.isArray(services) ? services.join(', ') : services || '',
        role,
        isapproved,
        isactive,
        businessName.trim()
      ];
    }

    else {
      return res.status(400).json({ message: 'Invalid role type' });
    }

    const [result] = await db.query(insertQuery, values);

    return res.status(200).json({
      message: role === 2 ? 'Chef registered successfully' : 'Vendor registered successfully',
      userId: result.insertId
    });

  } catch (err) {
    console.error('Error in /addUser:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
