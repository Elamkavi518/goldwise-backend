const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Wishlist extends Model {}

Wishlist.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: true },
  label: { type: DataTypes.STRING, allowNull: false },
  jewelryType: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  modelName: 'Wishlist',
  tableName: 'wishlist_items',
  indexes: [{ fields: ['userId'] }],
});

module.exports = Wishlist;
