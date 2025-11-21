const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// ✅ POST /login
router.post('/', async (req, res) => {
  console.log('🔥 /login route triggered');
  const { username, password } = req.body;
  console.log('📥 Received POST /login request with body:', req.body);

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // ✅ Run query using await
    console.log('🟡 Running SQL query...');
    const [results] = await db.query(
      'SELECT * FROM Users WHERE email = ? OR mobile = ? LIMIT 1',
      [username, username]
    );

    console.log('✅ SQL query completed. Results:', results);

    if (!results || results.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = results[0];

    // ✅ Compare password (plain text for now)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '2h' }
    );

    // ✅ Return success response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
      },
    });
  } catch (err) {
    console.error('❌ Database error:', err);
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
