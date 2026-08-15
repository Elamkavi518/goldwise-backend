const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class LoanProvider extends Model {}

LoanProvider.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('bank', 'nbfc'), allowNull: false },
  interestRatePct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  ratePerGram: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  processingFeePct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  minAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  maxAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  tenureMonthsMin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  tenureMonthsMax: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 24 },
  phone: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'LoanProvider', tableName: 'loan_providers' });

module.exports = LoanProvider;
