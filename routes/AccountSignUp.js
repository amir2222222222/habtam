const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { User, Admin, SubAdmin } = require('../models/User');
const asyncHandler = require('../utils/AsyncHandler');
const { admin, subadmin } = require("../middleware/AuthMiddleware");
const { hashPassword } = require('../utils/Bcrypt');
const { getTodayDate } = require('../utils/Time');
// Import centralized validators
const {
  validateName,
  validateUsername,
  validatePassword,
  validateCommission,
  validateCredit,
} = require('../utils/Validation');

router.get('/signup/admin', admin, (req, res) => {
  if (!req.admin) return res.status(403).json({ error: 'Unauthorized' });
  res.render("Admin_Panal/SignUpAdmin");
});

router.get('/signup/subadmin', admin, (req, res) => {
  if (!req.admin) return res.status(403).json({ error: 'Unauthorized' });
  res.render("Admin_Panal/SignUpSubAdmin");
});

router.get('/signup/user', subadmin, (req, res) => {
  if (!req.subadmin) return res.status(403).json({ error: 'Unauthorized' });
  res.render("SubAdmin_Panal/SignUpUser");
});


// ---------- Admin Signup ----------
router.post('/signup/admin', admin, asyncHandler(async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const [nameValidation, usernameValidation, passwordValidation] = await Promise.all([
    validateName(name),
    validateUsername(username),
    validatePassword(password)
  ]);

  const errors = [
    ...(!nameValidation.valid ? [nameValidation.error] : []),
    ...(!usernameValidation.valid ? [usernameValidation.error] : []),
    ...(!passwordValidation.valid ? [passwordValidation.error] : [])
  ];

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const newAdmin = new Admin({
    uuid: uuidv4(),
    name: nameValidation.value,
    username: usernameValidation.value,
    password: await hashPassword(passwordValidation.value),
    role: 'admin',
    state: 'active',
    createdBy: req.admin.id || 'system',
    createdAt: getTodayDate()
  });

  await newAdmin.save();

  return res.status(201).json({
    success: true,
    message: 'Admin account created successfully'
  });
}));

// ---------- SubAdmin Signup ----------
router.post('/signup/subadmin', admin, asyncHandler(async (req, res) => {
  const { name, username, password, credit } = req.body;

  if (!name || !username || !password || credit === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const [nameValidation, usernameValidation, passwordValidation, creditValidation] = await Promise.all([
    validateName(name),
    validateUsername(username),
    validatePassword(password),
    validateCredit(credit)
  ]);

  const errors = [
    ...(!nameValidation.valid ? [nameValidation.error] : []),
    ...(!usernameValidation.valid ? [usernameValidation.error] : []),
    ...(!passwordValidation.valid ? [passwordValidation.error] : []),
    ...(!creditValidation.valid ? [creditValidation.error] : [])
  ];

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const newSubAdmin = new SubAdmin({
    uuid: uuidv4(),
    name: nameValidation.value,
    username: usernameValidation.value,
    password: await hashPassword(passwordValidation.value),
    credit: creditValidation.value,
    balance: creditValidation.value,
    role: 'subadmin',
    state: 'active',
    createdBy: req.admin.id || 'system',
    createdAt: getTodayDate()
  });

  await newSubAdmin.save();

  return res.status(201).json({
    success: true,
    message: 'Subadmin account created successfully'
  });
}));

// ---------- User Signup ----------
router.post('/signup/user', subadmin, asyncHandler(async (req, res) => {
  const session = await SubAdmin.startSession();
  session.startTransaction();

  try {
    const { name, username, password, credit, user_commission, owner_commission } = req.body;

    if (!name || !username || !password || credit === undefined ||
        user_commission === undefined || owner_commission === undefined) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [nameValidation, usernameValidation, passwordValidation, creditValidation, userCommValidation, ownerCommValidation] = await Promise.all([
      validateName(name),
      validateUsername(username),
      validatePassword(password),
      validateCredit(credit),
      validateCommission(user_commission),
      validateCommission(owner_commission)
    ]);

    const errors = [
      ...(!nameValidation.valid ? [nameValidation.error] : []),
      ...(!usernameValidation.valid ? [usernameValidation.error] : []),
      ...(!passwordValidation.valid ? [passwordValidation.error] : []),
      ...(!creditValidation.valid ? [creditValidation.error] : []),
      ...(!userCommValidation.valid ? [userCommValidation.error] : []),
      ...(!ownerCommValidation.valid ? [ownerCommValidation.error] : [])
    ];

    if (errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ errors });
    }

    const subadminAccount = await SubAdmin.findById(req.subadmin.id)
      .session(session)
      .select('balance account_history');

    if (!subadminAccount || subadminAccount.balance < creditValidation.value) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Insufficient balance or subadmin not found' });
    }

    const newUser = new User({
      uuid: uuidv4(),
      name: nameValidation.value,
      username: usernameValidation.value,
      shopname: nameValidation.value,
      password: await hashPassword(passwordValidation.value),
      credit: creditValidation.value,
      balance: creditValidation.value,
      initial_balance: creditValidation.value,
      lastCreditTime: getTodayDate(),
      user_commission: userCommValidation.value,
      owner_commission: ownerCommValidation.value,
      state: "active",
      role: 'user',
      createdBy: req.subadmin.id || 'system',
      createdAt: getTodayDate(),
    });

    subadminAccount.balance -= creditValidation.value;
    subadminAccount.account_history.push({
      amount: -creditValidation.value,
      deposited_user_userName: usernameValidation.value,
      date: getTodayDate()
    });

    await newUser.save({ session });
    await subadminAccount.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: 'User account created successfully'
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}));

module.exports = router;
