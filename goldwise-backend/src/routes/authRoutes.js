const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('mobile').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid mobile number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, ctrl.signup);

router.post('/login', authLimiter, [
  body('identifier').trim().notEmpty().withMessage('Email or mobile is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, ctrl.login);

router.post('/send-otp', authLimiter, [
  body('destination').trim().notEmpty(),
  body('channel').isIn(['email', 'mobile']),
  body('purpose').isIn(['signup', 'login', 'password_reset']),
], validate, ctrl.sendOtp);

router.post('/verify-otp', authLimiter, [
  body('destination').trim().notEmpty(),
  body('code').trim().notEmpty(),
  body('purpose').isIn(['signup', 'login', 'password_reset']),
], validate, ctrl.verifyOtp);

router.post('/reset-password', authLimiter, [
  body('destination').trim().notEmpty(),
  body('resetToken').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, ctrl.resetPassword);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
