const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model {
  toSafeJSON() {
    const { id, name, email, mobile, role, isEmailVerified, isMobileVerified, createdAt } = this;
    return { id, name, email, mobile, role, isEmailVerified, isMobileVerified, createdAt };
  }
}

User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true, unique: true, validate: { isEmail: true } },
  mobile: { type: DataTypes.STRING, allowNull: true, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('customer', 'store_manager', 'admin'), allowNull: false, defaultValue: 'customer' },
  isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  isMobileVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  indexes: [{ unique: true, fields: ['email'] }, { unique: true, fields: ['mobile'] }],
  validate: {
    hasEmailOrMobile() {
      if (!this.email && !this.mobile) {
        throw new Error('A user must have an email or a mobile number.');
      }
    },
  },
});

module.exports = User;
