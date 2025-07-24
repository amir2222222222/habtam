const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "habtambingobingo";

// Create JWT with default 7d expiry, supports overriding options
function generateToken(payload, jwtOptions = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d", // Default expiry
    ...jwtOptions,
  });
}

// Verify JWT
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  });
}

// Update JWT while keeping original expiry
function updateToken(oldToken, updates = {}) {
  const decoded = jwt.decode(oldToken, { complete: true });

  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    throw new Error("Invalid token or missing expiry.");
  }

  const exp = decoded.payload.exp;

  const updatedPayload = {
    ...decoded.payload,
    ...updates,
    iat: undefined, // Remove to let jwt.sign set it
    exp: undefined, // Remove to manually set below
  };

  // Set exp manually
  return jwt.sign(updatedPayload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: exp - Math.floor(Date.now() / 1000),
  });
}

module.exports = {
  generateToken,
  verifyToken,
  updateToken,
};
