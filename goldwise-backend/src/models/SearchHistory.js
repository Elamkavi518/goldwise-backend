const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SearchHistory extends Model {}

SearchHistory.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  query: { type: DataTypes.STRING, allowNull: false },
}, { sequelize, modelName: 'SearchHistory', tableName: 'search_history', indexes: [{ fields: ['userId'] }] });

module.exports = SearchHistory;
