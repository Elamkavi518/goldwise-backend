// Vercel entry point. Vercel runs this file as a serverless function for every request
// under /api/*, instead of a long-running `node src/server.js` process. The Express app
// itself (routes, middleware, controllers) is unchanged — only how it's *booted* differs.
const app = require('../src/app');
const { sequelize } = require('../src/models');

let dbReady = null;
function ensureDb() {
  if (!dbReady) {
    dbReady = sequelize.authenticate().then(() => sequelize.sync());
  }
  return dbReady;
}

module.exports = async (req, res) => {
  await ensureDb();
  return app(req, res);
};
