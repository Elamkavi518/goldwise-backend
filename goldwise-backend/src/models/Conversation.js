const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Conversation extends Model {}

Conversation.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
  lastMessageAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, modelName: 'Conversation', tableName: 'conversations', indexes: [{ fields: ['userId'] }, { fields: ['status'] }] });

module.exports = Conversation;
