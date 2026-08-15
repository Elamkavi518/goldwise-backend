const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SystemSetting extends Model {}

SystemSetting.init({
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT, allowNull: false },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'SystemSetting', tableName: 'system_settings' });

module.exports = SystemSetting;
