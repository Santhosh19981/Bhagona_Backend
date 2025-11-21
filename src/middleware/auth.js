// src/middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. Token missing or invalid." });
    }

    const token = authHeader.split(" ")[1];
    const secretKey = process.env.JWT_SECRET || "your_jwt_secret_key";

    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
