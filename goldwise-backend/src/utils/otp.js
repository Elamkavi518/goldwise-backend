const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

function generateNumericCode(length = env.otp.length) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

async function hashCode(code) {
  return bcrypt.hash(code, 10);
}

async function verifyCode(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = { generateNumericCode, hashCode, verifyCode };
