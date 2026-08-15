const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Product extends Model {}

Product.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  jewelryType: { type: DataTypes.STRING, allowNull: false },
  purity: { type: DataTypes.STRING, allowNull: false },
  weightGrams: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'Product', tableName: 'products', indexes: [{ fields: ['storeId'] }] });

module.exports = Product;
