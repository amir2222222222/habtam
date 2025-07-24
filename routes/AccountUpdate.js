const express = require('express');
const router = express.Router();
const { User, Admin, SubAdmin } = require('../models/User');
const asyncHandler = require("../utils/AsyncHandler");
const { subadmin, admin } = require("../middleware/AuthMiddleware");
const { hashPassword, comparePassword } = require('../utils/Bcrypt');
const { getTodayDate } = require('../utils/Time');

// Import centralized validators
const {
  validateName,
  validateUsername,
  validatePassword,
  validateCommission,
  validateCredit,
  validateState
} = require('../utils/Validation');

// ---------- Update Admin ----------
router.put('/admin/:uuid', admin, asyncHandler(async (req, res) => {
  const adminDoc = await Admin.findOne({ uuid: req.params.uuid, createdBy: req.admin.id });
  if (!adminDoc) return res.status(404).json({ success: false, error: 'Admin account not found' });

  const updates = Object.entries(req.body);
  const errors = [];

  for (const [key, val] of updates) {
    try {
      switch (key) {
        case 'name': {
          const result = await validateName(val);
          if (!result.valid) throw new Error(result.error);
          adminDoc.name = result.value;
          break;
        }
        case 'username': {
          const result = await validateUsername(val);
          if (!result.valid) throw new Error(result.error);
          adminDoc.username = result.value;
          break;
        }
        case 'password': {
          const result = validatePassword(val);
          if (!result.valid) throw new Error(result.error);
          const isSame = await comparePassword(result.value, adminDoc.password);
          if (isSame) throw new Error('New password must be different from current password');
          adminDoc.password = await hashPassword(result.value);
          break;
        }
        case 'state': {
          const result = await validateState(val);
          if (!result.valid) throw new Error(result.error);
          adminDoc.state = result.value;
          break;
        }
        default:
          throw new Error(`Field "${key}" is not allowed`);
      }
    } catch (err) {
      errors.push(`${key}: ${err.message}`);
    }
  }

  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  await adminDoc.save();
  res.json({ success: true, message: 'Admin updated successfully' });
}));

// ---------- Update SubAdmin ----------
router.put('/subadmin/:uuid', admin, asyncHandler(async (req, res) => {
  const subadminDoc = await SubAdmin.findOne({ uuid: req.params.uuid, createdBy: req.admin.id });
  if (!subadminDoc) return res.status(404).json({ success: false, error: 'SubAdmin not found' });

  const updates = Object.entries(req.body);
  const errors = [];

  for (const [key, val] of updates) {
    try {
      switch (key) {
        case 'name': {
          const result = await validateName(val);
          if (!result.valid) throw new Error(result.error);
          subadminDoc.name = result.value;
          break;
        }
        case 'username': {
          const result = await validateUsername(val);
          if (!result.valid) throw new Error(result.error);
          subadminDoc.username = result.value;
          break;
        }
        case 'password': {
          const result = validatePassword(val);
          if (!result.valid) throw new Error(result.error);
          const isSame = await comparePassword(result.value, subadminDoc.password);
          if (isSame) throw new Error('New password must be different from current password');
          subadminDoc.password = await hashPassword(result.value);
          break;
        }
        case 'state': {
          const result = await validateState(val);
          if (!result.valid) throw new Error(result.error);
          subadminDoc.state = result.value;
          break;
        }
        case 'credit': {
          const result = await validateCredit(val);
          if (!result.valid) throw new Error(result.error);
          subadminDoc.credit = result.value;
          subadminDoc.balance += result.value;
          subadminDoc.lastCreditTime = getTodayDate();
          subadminDoc.account_history = [];
          break;
        }
        default:
          throw new Error(`Field "${key}" is not allowed`);
      }
    } catch (err) {
      errors.push(`${key}: ${err.message}`);
    }
  }

  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  await subadminDoc.save();
  res.json({ success: true, message: 'SubAdmin updated successfully' });
}));

// ---------- Update User ----------
router.put('/user/:uuid', subadmin, asyncHandler(async (req, res) => {
  const session = await SubAdmin.startSession();
  session.startTransaction();

  try {
    const userDoc = await User.findOne({ uuid: req.params.uuid, createdBy: req.subadmin.id }).session(session);
    if (!userDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updates = Object.entries(req.body);
    const errors = [];

    for (const [key, val] of updates) {
      try {
        switch (key) {
          case 'name': {
            const result = await validateName(val);
            if (!result.valid) throw new Error(result.error);
            userDoc.name = result.value;
            break;
          }
          case 'username': {
            const result = await validateUsername(val);
            if (!result.valid) throw new Error(result.error);
            userDoc.username = result.value;
            break;
          }
          case 'password': {
            const result = validatePassword(val);
            if (!result.valid) throw new Error(result.error);
            const isSame = await comparePassword(result.value, userDoc.password);
            if (isSame) throw new Error('New password must be different from current password');
            userDoc.password = await hashPassword(result.value);
            break;
          }
          case 'state': {
            const result = await validateState(val);
            if (!result.valid) throw new Error(result.error);
            userDoc.state = result.value;
            break;
          }
          case 'credit': {
            const result = await validateCredit(val);
            if (!result.valid) throw new Error(result.error);

            const subadminDoc = await SubAdmin.findById(req.subadmin.id).session(session).select('balance account_history');
            if (!subadminDoc || subadminDoc.balance < result.value) {
              throw new Error('Insufficient balance');
            }
            await SubAdmin.findByIdAndUpdate(req.subadmin.id, {
              $inc: { balance: -result.value },
              $push: {
                account_history: {
                  amount: -result.value,
                  deposited_user_userName: userDoc.username,
                  date: getTodayDate()
                }
              }
            }, { session });

            userDoc.credit = result.value;
            userDoc.balance += result.value;
            userDoc.initial_balance = userDoc.balance;
            userDoc.lastCreditTime = getTodayDate();
            userDoc.games = [];
            break;
          }
          default:
            throw new Error(`Field "${key}" is not allowed`);
        }
      } catch (err) {
        errors.push(`${key}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, errors });
    }

    await userDoc.save({ session });
    await session.commitTransaction();
    session.endSession();

    await userDoc.save();

    res.json({ success: true, message: 'User updated successfully' });

  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}));

module.exports = router;
