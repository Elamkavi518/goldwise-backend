const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Product, Store, AuditLog } = require('../models');

// ---- GET /api/jewelry/store/:storeId ---- (public)
const listForStore = asyncHandler(async (req, res) => {
  const rows = await Product.findAll({ where: { storeId: req.params.storeId, isActive: true } });
  res.json({
    success: true,
    data: rows.map(p => ({
      ...p.toJSON(),
      priceStatus: p.verifiedPrice != null ? 'verified' : 'unavailable',
      priceLabel: p.verifiedPrice != null
        ? `Verified Price • Last Updated: ${new Date(p.priceUpdatedAt).toLocaleString('en-IN')}`
        : 'Price not currently available',
    })),
  });
});

async function assertOwnsStore(userId, storeId) {
  const store = await Store.findByPk(storeId);
  if (!store) throw new ApiError(404, 'Store not found.');
  if (store.ownerId !== userId) throw new ApiError(403, 'You can only manage products for your own store.');
  return store;
}

// ---- POST /api/jewelry ---- (store_manager, own store; or admin)
const create = asyncHandler(async (req, res) => {
  const { storeId, name, jewelryType, purity, weightGrams } = req.body;
  if (req.user.role !== 'admin') await assertOwnsStore(req.user.id, storeId);
  const product = await Product.create({ storeId, name, jewelryType, purity, weightGrams });
  res.status(201).json({ success: true, data: product });
});

// ---- PUT /api/jewelry/:id/price ---- (store_manager, own store; or admin)
// This is the ONLY way a product's price is ever set — always a real number from a real
// store manager, with a real timestamp. There is no code path that computes/guesses this.
const updatePrice = asyncHandler(async (req, res) => {
  const { price } = req.body;
  if (!(price > 0)) throw new ApiError(400, 'price must be a positive number.');

  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found.');
  if (req.user.role !== 'admin') await assertOwnsStore(req.user.id, product.storeId);

  product.verifiedPrice = price;
  product.priceUpdatedAt = new Date();
  product.priceUpdatedBy = req.user.id;
  await product.save();

  await AuditLog.create({
    actorId: req.user.id, action: 'product.price_update',
    entityType: 'Product', entityId: product.id, meta: JSON.stringify({ price }),
  });

  res.json({ success: true, data: product });
});

module.exports = { listForStore, create, updatePrice };
