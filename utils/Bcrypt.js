const bcrypt = require('bcryptjs');

const saltRounds = 12;

// Hash the password with salt
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
}

// Compare plain password with hashed password
async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
};
