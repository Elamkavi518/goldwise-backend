require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || '*',

  db: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    url: process.env.DATABASE_URL,
    sqliteStorage: process.env.SQLITE_STORAGE || './data/dev.sqlite',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_only_insecure_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_only_insecure_refresh_secret_change_me'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@goldwise.app',
    password: process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!',
    name: process.env.ADMIN_NAME || 'Admin',
  },

  otp: {
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Thangam <no-reply@thangam.app>',
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'console',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    },
  },

  goldRate: {
    provider: process.env.GOLD_RATE_PROVIDER || 'metals-dev',
    apiKey: process.env.GOLDAPI_KEY || '',
    pollMinutes: parseInt(process.env.GOLD_RATE_POLL_MINUTES || '5', 10),
    currency: process.env.GOLD_RATE_CURRENCY || 'INR',
  },

  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  },

  cronSecret: process.env.CRON_SECRET || '',
};
