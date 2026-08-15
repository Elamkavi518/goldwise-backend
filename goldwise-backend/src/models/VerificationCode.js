const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// Reused for signup OTP, login OTP, and password-reset codes — distinguished by `purpose`.
class VerificationCode extends Model {}

VerificationCode.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  channel: { type: DataTypes.ENUM('email', 'mobile'), allowNull: false },
  destination: { type: DataTypes.STRING, allowNull: false },
  codeHash: { type: DataTypes.STRING, allowNull: false },
  purpose: { type: DataTypes.ENUM('signup', 'login', 'password_reset'), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  consumedAt: { type: DataTypes.DATE, allowNull: true },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  sequelize,
  modelName: 'VerificationCode',
  tableName: 'verification_codes',
  indexes: [{ fields: ['destination', 'purpose'] }, { fields: ['expiresAt'] }],
});

module.exports = VerificationCode;
