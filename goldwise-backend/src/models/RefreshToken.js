const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// Storing hashed refresh tokens (not the raw token) lets logout / "sign out everywhere"
// and rotation work for real, instead of JWT logout being a no-op.
class RefreshToken extends Model {}

RefreshToken.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenHash: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
  userAgent: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  modelName: 'RefreshToken',
  tableName: 'refresh_tokens',
  indexes: [{ fields: ['userId'] }, { fields: ['expiresAt'] }],
});

module.exports = RefreshToken;
