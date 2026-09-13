const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// senderType distinguishes a real Thangam team member from an automated reply — the
// frontend must show that distinction to the customer, never blur it (per spec: "clearly
// identify whether a response is from a real team member or an automated assistant").
class Message extends Model {}

Message.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  senderId: { type: DataTypes.UUID, allowNull: true }, // null for system/automated messages
  senderType: { type: DataTypes.ENUM('customer', 'team', 'system'), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  attachmentUrl: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('sent', 'delivered', 'read'), allowNull: false, defaultValue: 'sent' },
  readAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, modelName: 'Message', tableName: 'messages', indexes: [{ fields: ['conversationId'] }, { fields: ['createdAt'] }] });

module.exports = Message;
