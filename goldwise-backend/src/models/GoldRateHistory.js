const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class GoldRateHistory extends Model {}

GoldRateHistory.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rate24k: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  rate22k: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  rate18k: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'INR' },
  source: { type: DataTypes.STRING, allowNull: false },
  isLive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  fetchedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  errorMessage: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  modelName: 'GoldRateHistory',
  tableName: 'gold_rate_history',
  indexes: [{ fields: ['fetchedAt'] }],
});

module.exports = GoldRateHistory;
