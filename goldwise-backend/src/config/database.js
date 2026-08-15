const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('./logger');

let sequelize;

if (env.db.dialect === 'postgres') {
  if (!env.db.url) {
    throw new Error('DATABASE_URL is required when DB_DIALECT=postgres');
  }
  sequelize = new Sequelize(env.db.url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: env.nodeEnv === 'production' ? {
      ssl: { require: true, rejectUnauthorized: false },
    } : {},
    // Kept small on purpose: on serverless (Vercel), many separate function instances can
    // each hold their own pool at once, so a large max here multiplies fast and can exhaust
    // Postgres's connection limit. If you deploy on Render instead (one persistent process),
    // you can safely raise this. For Vercel specifically, using a provider with built-in
    // connection pooling (e.g. Neon's pooled connection string) is the more robust fix.
    pool: { max: 3, min: 0, acquire: 30000, idle: 5000 },
  });
} else {
  // Zero-install local/dev fallback — never used in production.
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: env.db.sqliteStorage,
    logging: false,
  });
}

module.exports = sequelize;
