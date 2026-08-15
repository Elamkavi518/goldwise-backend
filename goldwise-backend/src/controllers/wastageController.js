const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { JewelryWastage, Store, AuditLog } = require('../models');

// ---- GET /api/wastage/store/:storeId ---- (public — customers need to see it before buying)
const listForStore = asyncHandler(async (req, res) => {
  const rows = await JewelryWastage.findAll({ where: { storeId: req.params.storeId }, order: [['jewelryType', 'ASC']] });
  res.json({ success: true, data: rows });
});

// ---- GET /api/wastage/types ----
const listTypes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: JewelryWastage.JEWELRY_TYPES });
});

async function assertOwnsStore(userId, storeId) {
  const store = await Store.findByPk(storeId);
  if (!store) throw new ApiError(404, 'Store not found.');
  if (store.ownerId !== userId) throw new ApiError(403, 'You can only manage wastage for your own store.');
  return store;
}

// ---- PUT /api/wastage/store/:storeId ---- (store_manager, own store only; or admin)
const upsert = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { jewelryType, wastagePct, makingChargePct } = req.body;

  if (req.user.role !== 'admin') {
    await assertOwnsStore(req.user.id, storeId);
  }
  if (!JewelryWastage.JEWELRY_TYPES.includes(jewelryType)) {
    throw new ApiError(400, `jewelryType must be one of: ${JewelryWastage.JEWELRY_TYPES.join(', ')}`);
  }
  if (!(wastagePct >= 0 && wastagePct <= 100)) {
    throw new ApiError(400, 'wastagePct must be between 0 and 100.');
  }

  const [row] = await JewelryWastage.upsert({
    storeId,
    jewelryType,
    wastagePct,
    makingChargePct: makingChargePct ?? null,
    updatedBy: req.user.id,
  }, { returning: true });

  await AuditLog.create({
    actorId: req.user.id,
    action: 'wastage.update',
    entityType: 'JewelryWastage',
    entityId: row.id,
    meta: JSON.stringify({ storeId, jewelryType, wastagePct, makingChargePct }),
  });

  res.json({ success: true, data: row });
});

module.exports = { listForStore, listTypes, upsert };
