require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Store, JewelryWastage, LoanProvider, GoldRateHistory } = require('../models');
const env = require('../config/env');
const logger = require('../config/logger');

async function seed() {
  await sequelize.sync();

  // ---- Admin account ----
  const [admin, adminCreated] = await User.findOrCreate({
    where: { email: env.admin.email },
    defaults: {
      name: env.admin.name,
      email: env.admin.email,
      passwordHash: await bcrypt.hash(env.admin.password, 12),
      role: 'admin',
      isEmailVerified: true,
    },
  });
  logger.info(adminCreated ? `Admin created: ${admin.email}` : `Admin already exists: ${admin.email}`);

  // ---- Sample verified store + wastage config, so the calculator/wastage endpoints have real data to return ----
  const [storeOwner] = await User.findOrCreate({
    where: { email: 'store.demo@thangam.app' },
    defaults: {
      name: 'Demo Store Manager',
      email: 'store.demo@thangam.app',
      passwordHash: await bcrypt.hash('DemoStore123!', 12),
      role: 'store_manager',
      isEmailVerified: true,
    },
  });

  const [store] = await Store.findOrCreate({
    where: { ownerId: storeOwner.id },
    defaults: {
      name: 'Thangam Demo Jewellers',
      city: 'Trichy',
      address: 'Sample address, Trichy, Tamil Nadu',
      phone: '+91 98765 43210',
      email: 'store.demo@thangam.app',
      isVerified: true,
      verifiedAt: new Date(),
      defaultMakingChargePct: 12,
    },
  });

  const wastageDefaults = [
    ['Ring', 6.5], ['Chain', 8.0], ['Necklace', 9.5], ['Bracelet', 7.0],
    ['Bangle', 7.5], ['Earrings', 5.5], ['Pendant', 6.0], ['Anklet', 6.5], ['Coin', 1.0],
  ];
  for (const [jewelryType, wastagePct] of wastageDefaults) {
    await JewelryWastage.findOrCreate({
      where: { storeId: store.id, jewelryType },
      defaults: { wastagePct, updatedBy: storeOwner.id },
    });
  }
  logger.info(`Demo store ready: ${store.name} (${store.id})`);

  // ---- Sample loan providers ----
  const providers = [
    { name: 'Muthoot Finance', type: 'nbfc', interestRatePct: 9.5, ratePerGram: 11200, processingFeePct: 0.5, minAmount: 3000, maxAmount: 2500000, tenureMonthsMin: 3, tenureMonthsMax: 24, phone: '+91 98765 43210' },
    { name: 'Manappuram Finance', type: 'nbfc', interestRatePct: 10.2, ratePerGram: 11050, processingFeePct: 0.4, minAmount: 1500, maxAmount: 2000000, tenureMonthsMin: 3, tenureMonthsMax: 36, phone: '+91 98765 43211' },
    { name: 'State Bank of India', type: 'bank', interestRatePct: 8.7, ratePerGram: 11520, processingFeePct: 0.25, minAmount: 20000, maxAmount: 5000000, tenureMonthsMin: 6, tenureMonthsMax: 36, phone: '+91 98765 43213' },
    { name: 'HDFC Bank', type: 'bank', interestRatePct: 8.9, ratePerGram: 11480, processingFeePct: 0.3, minAmount: 25000, maxAmount: 4000000, tenureMonthsMin: 6, tenureMonthsMax: 24, phone: '+91 98765 43214' },
  ];
  for (const p of providers) {
    await LoanProvider.findOrCreate({ where: { name: p.name }, defaults: p });
  }
  logger.info(`${providers.length} loan providers seeded.`);

  // ---- Seed one gold-rate row so /api/gold-rate/latest never 503s on a fresh install ----
  const existingRate = await GoldRateHistory.findOne();
  if (!existingRate) {
    await GoldRateHistory.create({
      rate24k: 15235, rate22k: 13965, rate18k: 11426,
      currency: 'INR', source: 'seed-fallback (not live — run the server to fetch a real rate)',
      isLive: true, fetchedAt: new Date(),
    });
    logger.info('Seeded a starting gold-rate row so the API has something to serve immediately.');
  }

  logger.info('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed: ' + err.message, { stack: err.stack });
  process.exit(1);
});
