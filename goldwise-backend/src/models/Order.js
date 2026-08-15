const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Order extends Model {}

Order.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: true },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('processing', 'shipped', 'delivered', 'return_requested', 'cancelled'),
    allowNull: false,
    defaultValue: 'processing',
  },
  returnReason: { type: DataTypes.STRING, allowNull: true },
}, { sequelize, modelName: 'Order', tableName: 'orders', indexes: [{ fields: ['userId'] }] });

module.exports = Order;
