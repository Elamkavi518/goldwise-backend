const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/messageController');

const router = express.Router();
router.use(authenticate); // messaging is a protected feature — sign-in required

router.post('/conversations', ctrl.startConversation);
router.get('/conversations', ctrl.listConversations);
router.get('/conversations/:id', ctrl.getConversation);
router.post('/conversations/:id/reply', ctrl.reply);
router.get('/conversations/:id/poll', ctrl.poll);

module.exports = router;
