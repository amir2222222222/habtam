const { User, Admin, SubAdmin } = require('../models/User');

// ---------- Validation Constants ----------
const MIN_LENGTH = 8;
const MAX_LENGTH = 20;
const COMMON_PASSWORDS = ['password', '12345678', 'qwertyui', 'admin123'];
const INVALID_CHARS_REGEX = /[^a-zA-Z0-9]/; // Disallow anything that is not a-z, A-Z, or 0-9

// ---------- Validation Utilities ----------
const hasConsecutiveChars = (str) => /(.)\1{2,}/.test(str); // Checks for 3+ same consecutive chars

// Case-sensitive duplicate checks
const isDuplicateUsername = async (username) => {
  try {
    const exactUsername = username; // Case-sensitive check
    const [admin, subadmin, user] = await Promise.all([
      Admin.findOne({ username: exactUsername }),
      SubAdmin.findOne({ username: exactUsername }),
      User.findOne({ username: exactUsername })
    ]);
    return !!(admin || subadmin || user);
  } catch (error) {
    console.error('Duplicate username check failed:', error);
    return false;
  }
};

const isDuplicateName = async (name) => {
  try {
    const exactName = name; // Case-sensitive check
    const [admin, subadmin, user] = await Promise.all([
      Admin.findOne({ name: exactName }),
      SubAdmin.findOne({ name: exactName }),
      User.findOne({ name: exactName })
    ]);
    return !!(admin || subadmin || user);
  } catch (error) {
    console.error('Duplicate name check failed:', error);
    return false;
  }
};

// Generic error response formatter
const formatError = (message, code = 'VALIDATION_ERROR') => ({
  valid: false,
  error: message,
  code
});

// ---------- Main Validation Functions ----------

// Name Validation (8-20 chars, no special chars, case-sensitive)
async function validateName(name) {
  try {
    if (!name || typeof name !== 'string') {
      return formatError('Name is required');
    }

    const trimmed = name.trim();
    
    if (trimmed.length < MIN_LENGTH) {
      return formatError(`Name must be at least ${MIN_LENGTH} characters`);
    }

    if (trimmed.length > MAX_LENGTH) {
      return formatError(`Name cannot exceed ${MAX_LENGTH} characters`);
    }

    if (INVALID_CHARS_REGEX.test(trimmed)) {
      return formatError('Name can only contain letters and numbers');
    }

    if (hasConsecutiveChars(trimmed)) {
      return formatError('Name contains invalid character sequences');
    }

    if (await isDuplicateName(trimmed)) {
      return formatError('This name is already in use');
    }

    return { valid: true, value: trimmed };
  } catch (error) {
    console.error('Name validation failed:', error);
    return formatError('Name validation error');
  }
}

// Username Validation (8-20 chars, no special chars, case-sensitive)
async function validateUsername(username) {
  try {
    if (!username || typeof username !== 'string') {
      return formatError('Username is required');
    }

    const trimmed = username.trim();
    
    if (trimmed.length < MIN_LENGTH) {
      return formatError(`Username must be at least ${MIN_LENGTH} characters`);
    }

    if (trimmed.length > MAX_LENGTH) {
      return formatError(`Username cannot exceed ${MAX_LENGTH} characters`);
    }

    if (INVALID_CHARS_REGEX.test(trimmed)) {
      return formatError('Username can only contain letters and numbers');
    }

    if (hasConsecutiveChars(trimmed)) {
      return formatError('Username contains invalid character sequences');
    }

    if (await isDuplicateUsername(trimmed)) {
      return formatError('This username is already taken');
    }

    return { valid: true, value: trimmed };
  } catch (error) {
    console.error('Username validation failed:', error);
    return formatError('Username validation error');
  }
}

// Password Validation (8-20 chars, no special chars)
function validatePassword(password) {
  try {
    if (!password || typeof password !== 'string') {
      return formatError('Password is required');
    }

    if (password.length < MIN_LENGTH) {
      return formatError(`Password must be at least ${MIN_LENGTH} characters`);
    }

    if (password.length > MAX_LENGTH) {
      return formatError(`Password cannot exceed ${MAX_LENGTH} characters`);
    }

    if (INVALID_CHARS_REGEX.test(password)) {
      return formatError('Password can only contain letters and numbers');
    }

    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      return formatError('Password is too common');
    }

    const requirements = [
      { test: /[A-Z]/, error: 'Must contain at least one uppercase letter' },
      { test: /[a-z]/, error: 'Must contain at least one lowercase letter' },
      { test: /[0-9]/, error: 'Must contain at least one number' }
    ];

    for (const req of requirements) {
      if (!req.test.test(password)) {
        return formatError(req.error);
      }
    }

    return { valid: true, value: password };
  } catch (error) {
    console.error('Password validation failed:', error);
    return formatError('Password validation error');
  }
}

// Commission Validation (0-100 number)
async function validateCommission(commission) {
  try {
    const num = parseFloat(commission);
    if (isNaN(num)) {
      return formatError('Commission must be a number');
    }

    if (num < 0 || num > 100) {
      return formatError('Commission must be between 0 and 100');
    }

    return { valid: true, value: num };
  } catch (error) {
    console.error('Commission validation failed:', error);
    return formatError('Commission validation error');
  }
}

// Credit Validation (positive number)
async function validateCredit(credit) {
  try {
    const num = parseFloat(credit);
    if (isNaN(num)) {
      return formatError('Credit must be a number');
    }

    if (num < 0) {
      return formatError('Credit must be a positive number');
    }

    return { valid: true, value: num };
  } catch (error) {
    console.error('Credit validation failed:', error);
    return formatError('Credit validation error');
  }
}

// State Validation (only 'active' or 'suspended')
async function validateState(state) {
  try {
    const validStates = ['active', 'suspended'];
    if (!validStates.includes(state)) {
      return formatError(`State must be one of: ${validStates.join(', ')}`);
    }
    return { valid: true, value: state };
  } catch (error) {
    console.error('State validation failed:', error);
    return formatError('State validation error');
  }
}

module.exports = {
  validateName,
  validateUsername,
  validatePassword,
  validateCommission,
  validateCredit,
  validateState,
};
