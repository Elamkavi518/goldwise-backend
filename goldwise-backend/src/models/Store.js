const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Store extends Model {}

Store.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  defaultMakingChargePct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 10.0 },
}, {
  sequelize,
  modelName: 'Store',
  tableName: 'stores',
  indexes: [{ fields: ['ownerId'] }, { fields: ['isVerified'] }],
});

module.exports = Store;
