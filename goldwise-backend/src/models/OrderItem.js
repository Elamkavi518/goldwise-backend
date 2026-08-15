const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class OrderItem extends Model {}

OrderItem.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  priceAtPurchase: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  wastagePctUsed: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
}, { sequelize, modelName: 'OrderItem', tableName: 'order_items', indexes: [{ fields: ['orderId'] }] });

module.exports = OrderItem;
