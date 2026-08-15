const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Review extends Model {}

Review.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  text: { type: DataTypes.TEXT, allowNull: false },
  photoUrl: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
  moderatedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'Review', tableName: 'reviews', indexes: [{ fields: ['storeId'] }, { fields: ['status'] }] });

module.exports = Review;
