const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

const JEWELRY_TYPES = [
  'Ring', 'Chain', 'Necklace', 'Bracelet', 'Bangle',
  'Earrings', 'Pendant', 'Anklet', 'Coin', 'GoldBar', 'Other',
];

class JewelryWastage extends Model {}

JewelryWastage.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId: { type: DataTypes.UUID, allowNull: false },
  jewelryType: { type: DataTypes.ENUM(...JEWELRY_TYPES), allowNull: false },
  wastagePct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  makingChargePct: { type: DataTypes.DECIMAL(5, 2), allowNull: true }, // overrides store default when set
  updatedBy: { type: DataTypes.UUID, allowNull: false },
}, {
  sequelize,
  modelName: 'JewelryWastage',
  tableName: 'jewelry_wastage',
  indexes: [{ unique: true, fields: ['storeId', 'jewelryType'] }],
});

JewelryWastage.JEWELRY_TYPES = JEWELRY_TYPES;
module.exports = JewelryWastage;
