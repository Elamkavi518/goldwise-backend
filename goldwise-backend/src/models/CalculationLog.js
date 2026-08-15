const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// Every calculator run is logged with the exact rate + wastage values used at that moment,
// so a customer (and an auditing admin) can always see exactly how a figure was produced.
class CalculationLog extends Model {}

CalculationLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: true },
  jewelryType: { type: DataTypes.STRING, allowNull: false },
  purity: { type: DataTypes.STRING, allowNull: false },
  weightGrams: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  wastagePctUsed: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  makingChargePctUsed: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  hallmarkCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  ratePerGramUsed: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  goldRateFetchedAt: { type: DataTypes.DATE, allowNull: true },
  finalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, {
  sequelize,
  modelName: 'CalculationLog',
  tableName: 'calculation_logs',
  indexes: [{ fields: ['userId'] }, { fields: ['createdAt'] }],
});

module.exports = CalculationLog;
