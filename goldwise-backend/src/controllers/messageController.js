const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Conversation, Message, User } = require('../models');
const { sendEmail } = require('../services/notificationService');

// ---- POST /api/messages/conversations ---- (customer, protected) — starts or reuses one
const startConversation = asyncHandler(async (req, res) => {
  const { subject, body } = req.body;
  if (!body) throw new ApiError(400, 'body is required.');

  let convo = await Conversation.findOne({ where: { userId: req.user.id, status: 'open' } });
  if (!convo) {
    convo = await Conversation.create({ userId: req.user.id, subject: subject || 'General enquiry' });
  }
  const message = await Message.create({
    conversationId: convo.id,
    senderId: req.user.id,
    senderType: 'customer',
    body,
    status: 'sent',
  });
  convo.lastMessageAt = new Date();
  await convo.save();

  // Real notification to the team — logged to console in dev mode without real SMTP configured,
  // exactly like the OTP emails (see notificationService.js), never silently pretended.
  await sendEmail({
    to: 'team@thangam.app',
    subject: `New message from ${req.user.name}`,
    text: `Conversation ${convo.id}: ${body}`,
  });

  res.status(201).json({ success: true, data: { conversation: convo, message } });
});

// ---- GET /api/messages/conversations ---- (customer: own; admin: all)
const listConversations = asyncHandler(async (req, res) => {
  const where = req.user.role === 'admin' ? {} : { userId: req.user.id };
  const rows = await Conversation.findAll({
    where,
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [['lastMessageAt', 'DESC']],
  });
  res.json({ success: true, data: rows });
});

// ---- GET /api/messages/conversations/:id ---- (own conversation, or admin)
const getConversation = asyncHandler(async (req, res) => {
  const convo = await Conversation.findByPk(req.params.id, {
    include: [{ model: Message, as: 'messages', order: [['createdAt', 'ASC']] }],
  });
  if (!convo) throw new ApiError(404, 'Conversation not found.');
  if (req.user.role !== 'admin' && convo.userId !== req.user.id) throw new ApiError(403, 'Not your conversation.');

  // Mark team messages as read the moment the customer opens the conversation.
  if (req.user.role !== 'admin') {
    await Message.update(
      { status: 'read', readAt: new Date() },
      { where: { conversationId: convo.id, senderType: 'team', status: ['sent', 'delivered'] } }
    );
  }
  const fresh = await Conversation.findByPk(convo.id, { include: [{ model: Message, as: 'messages' }] });
  res.json({ success: true, data: fresh });
});

// ---- POST /api/messages/conversations/:id/reply ---- (customer OR admin/team)
const reply = asyncHandler(async (req, res) => {
  const convo = await Conversation.findByPk(req.params.id);
  if (!convo) throw new ApiError(404, 'Conversation not found.');
  if (req.user.role !== 'admin' && convo.userId !== req.user.id) throw new ApiError(403, 'Not your conversation.');

  const { body, attachmentUrl } = req.body;
  if (!body) throw new ApiError(400, 'body is required.');

  const senderType = req.user.role === 'admin' ? 'team' : 'customer';
  const message = await Message.create({
    conversationId: convo.id,
    senderId: req.user.id,
    senderType,
    body,
    attachmentUrl: attachmentUrl || null,
    status: 'sent',
  });
  convo.lastMessageAt = new Date();
  await convo.save();

  if (senderType === 'team') {
    const customer = await User.findByPk(convo.userId);
    if (customer?.email) {
      await sendEmail({ to: customer.email, subject: 'New reply from the Thangam team', text: body });
    }
  }

  res.status(201).json({ success: true, data: message });
});

// ---- GET /api/messages/conversations/:id/poll?since=<ISO timestamp> ----
// Polling instead of WebSockets — works identically whether the backend ends up on Vercel
// (serverless, can't hold a persistent socket) or Render (could add real sockets later).
const poll = asyncHandler(async (req, res) => {
  const convo = await Conversation.findByPk(req.params.id);
  if (!convo) throw new ApiError(404, 'Conversation not found.');
  if (req.user.role !== 'admin' && convo.userId !== req.user.id) throw new ApiError(403, 'Not your conversation.');

  const since = req.query.since ? new Date(req.query.since) : new Date(0);
  const { Op } = require('sequelize');
  const rows = await Message.findAll({
    where: { conversationId: convo.id, createdAt: { [Op.gt]: since } },
    order: [['createdAt', 'ASC']],
  });
  res.json({ success: true, data: rows, serverTime: new Date().toISOString() });
});

module.exports = { startConversation, listConversations, getConversation, reply, poll };
