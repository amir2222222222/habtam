const express = require('express');
const router = express.Router();
const { User, Admin, SubAdmin } = require('../models/User');
const { user } = require("../middleware/AuthMiddleware");
const { hashPassword, comparePassword } = require('../utils/Bcrypt');
const asyncHandler = require('../utils/AsyncHandler');

// Import validation functions
const {
  validateName,
  validateUsername,
  validatePassword,
  validateCommission
} = require('../utils/Validation');

// ---------- GET /profile ----------
router.get('/profile', user, asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user.id).select('-password');
  
  if (!currentUser) {
    return res.redirect('/login');
  }

  res.render('Profile', {
    name: currentUser.name,
    username: currentUser.username,
    shopname: currentUser.shopname || currentUser.name,
    userCommission: currentUser.user_commission || 0,
    successUsername: req.query.successUsername,
    successCommission: req.query.successCommission,
    successPassword: req.query.successPassword,
    errorUsername: req.query.errorUsername,
    errorCommission: req.query.errorCommission,
    errorPassword: req.query.errorPassword
  });
}));

// ---------- POST /username ----------
router.post('/username', user, asyncHandler(async (req, res) => {
  const { username } = req.body;
  const currentUserId = req.user.id.toString();

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return res.json({ success: false, error: 'User not found' });
  }

  const result = await validateUsername(username);
  if (!result.valid) {
    return res.json({ success: false, error: result.error });
  }

  const trimmedUsername = result.value;
  if (trimmedUsername === currentUser.username) {
    return res.json({
      success: true,
      message: 'This is already your current username',
      newUsername: currentUser.username
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    currentUserId,
    { username: trimmedUsername },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    message: 'Username updated successfully',
    newUsername: updatedUser.username
  });
}));

// ---------- POST /name ----------
router.post('/name', user, asyncHandler(async (req, res) => {
  const { name } = req.body;
  const currentUserId = req.user.id.toString();

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return res.json({ success: false, error: 'User not found' });
  }

  const result = await validateName(name);
  if (!result.valid) {
    return res.json({ success: false, error: result.error });
  }

  const trimmedName = result.value;
  if (trimmedName === currentUser.name) {
    return res.json({
      success: true,
      message: 'This is already your current name',
      newName: currentUser.name
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    currentUserId,
    { name: trimmedName },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    message: 'Name updated successfully',
    newName: updatedUser.name
  });
}));

// ---------- POST /password ----------
router.post('/password', user, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.json({ success: false, error: 'All password fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.json({ success: false, error: 'New passwords do not match' });
  }

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return res.json({ success: false, error: validation.error });
  }

  const userDoc = await User.findById(req.user.id).select('+password');
  if (!userDoc) {
    return res.json({ success: false, error: 'User not found' });
  }

  const isMatch = await comparePassword(currentPassword, userDoc.password);
  if (!isMatch) {
    return res.json({ success: false, error: 'Current password is incorrect' });
  }

  const isSamePassword = await comparePassword(newPassword, userDoc.password);
  if (isSamePassword) {
    return res.json({
      success: false,
      error: 'New password must be different from current password'
    });
  }

  const hashedPassword = await hashPassword(newPassword);
  await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });

  return res.json({ success: true, message: 'Password updated successfully' });
}));

// ---------- POST /commission ----------
router.post('/commission', user, asyncHandler(async (req, res) => {
  const { commission } = req.body;

  const validation = await validateCommission(commission);
  if (!validation.valid) {
    return res.json({ success: false, error: validation.error });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { user_commission: validation.value },
    { new: true }
  ).select('-password');

  return res.json({
    success: true,
    newCommission: updatedUser.user_commission
  });
}));

module.exports = router;