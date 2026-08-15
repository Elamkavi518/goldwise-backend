const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

const router = express.Router();
router.use(authenticate);

router.get('/me', ctrl.getProfile);
router.put('/me', [body('name').optional().trim().notEmpty()], validate, ctrl.updateProfile);
router.post('/me/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, ctrl.changePassword);

module.exports = router;
