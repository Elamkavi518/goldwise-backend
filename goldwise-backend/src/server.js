const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { sequelize } = require('./models');
const { startGoldRateCron } = require('./jobs/goldRateCron');

async function start() {
  try {
    await sequelize.authenticate();
    logger.info(`Database connection established (${env.db.dialect}).`);

    // Create tables if they don't exist yet. Do NOT use sync({ alter: true }) here —
    // on repeated boots it triggers a known Sequelize+SQLite table-rebuild loop, and in
    // Postgres it's still not a substitute for real migrations. Run `npm run seed` once
    // after first boot, and use sequelize-cli migrations for any schema change after that.
    await sequelize.sync();
    logger.info('Database models synced (tables created if missing).');

    startGoldRateCron();

    app.listen(env.port, () => {
      logger.info(`GoldWise API listening on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    logger.error('Failed to start server: ' + err.message, { stack: err.stack });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection: ' + reason);
});

start();
