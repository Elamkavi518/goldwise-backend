const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const VerificationCode = require('./VerificationCode');
const Store = require('./Store');
const JewelryWastage = require('./JewelryWastage');
const GoldRateHistory = require('./GoldRateHistory');
const LoanProvider = require('./LoanProvider');
const Wishlist = require('./Wishlist');
const CalculationLog = require('./CalculationLog');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Review = require('./Review');
const SystemSetting = require('./SystemSetting');
const AuditLog = require('./AuditLog');

User.hasMany(RefreshToken, { foreignKey: 'userId' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Store, { foreignKey: 'ownerId', as: 'store' });
Store.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Store.hasMany(JewelryWastage, { foreignKey: 'storeId', as: 'wastageConfig' });
JewelryWastage.belongsTo(Store, { foreignKey: 'storeId' });

Store.hasMany(Product, { foreignKey: 'storeId', as: 'products' });
Product.belongsTo(Store, { foreignKey: 'storeId' });

User.hasMany(Wishlist, { foreignKey: 'userId' });
Wishlist.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(CalculationLog, { foreignKey: 'userId' });
CalculationLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(Store, { foreignKey: 'storeId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });
Store.hasMany(Review, { foreignKey: 'storeId' });
Review.belongsTo(Store, { foreignKey: 'storeId' });

module.exports = {
  sequelize,
  User,
  RefreshToken,
  VerificationCode,
  Store,
  JewelryWastage,
  GoldRateHistory,
  LoanProvider,
  Wishlist,
  CalculationLog,
  Product,
  Order,
  OrderItem,
  Review,
  SystemSetting,
  AuditLog,
};
