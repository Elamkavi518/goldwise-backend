const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AuditLog extends Model {}

AuditLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actorId: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: true },
  entityId: { type: DataTypes.STRING, allowNull: true },
  meta: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, modelName: 'AuditLog', tableName: 'audit_logs', indexes: [{ fields: ['createdAt'] }, { fields: ['action'] }] });

module.exports = AuditLog;
