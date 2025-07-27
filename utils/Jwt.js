const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "habtambingobingo";

// Create JWT (no expiry by default)
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    // Add `expiresIn: '7d'` if you want expiration in the future
  });
}

// Verify JWT
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  });
}

module.exports = {
  generateToken,
  verifyToken,
};