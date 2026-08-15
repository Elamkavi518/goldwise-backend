const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, OrderItem, Product, JewelryWastage, GoldRateHistory, sequelize } = require('../models');

// ---- GET /api/orders ---- (protected — the signed-in user's own orders)
const list = asyncHandler(async (req, res) => {
  const rows = await Order.findAll({
    where: { userId: req.user.id },
    include: [{ model: OrderItem, as: 'items', include: [Product] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: rows });
});

// ---- POST /api/orders ---- (protected) — items: [{ productId, quantity }]
// Price is computed server-side from the real, current gold rate + that store's real wastage
// config for the product's jewelry type — never a placeholder or client-supplied price.
const create = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || !items.length) throw new ApiError(400, 'items must be a non-empty array.');

  const latestRate = await GoldRateHistory.findOne({ order: [['fetchedAt', 'DESC']] });
  if (!latestRate) throw new ApiError(503, 'No gold rate available yet. Try again shortly.');

  const result = await sequelize.transaction(async (t) => {
    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) throw new ApiError(404, `Product ${item.productId} not found.`);

      const wastageRow = await JewelryWastage.findOne({
        where: { storeId: product.storeId, jewelryType: product.jewelryType },
        transaction: t,
      });
      if (!wastageRow) {
        throw new ApiError(409, `${product.name}'s store has not configured wastage for "${product.jewelryType}" — cannot price this item yet.`);
      }

      const ratePerGram = product.purity === '24K' ? parseFloat(latestRate.rate24k)
        : product.purity === '22K' ? parseFloat(latestRate.rate22k)
        : parseFloat(latestRate.rate18k);

      const weight = parseFloat(product.weightGrams);
      const wastagePct = parseFloat(wastageRow.wastagePct);
      const makingPct = wastageRow.makingChargePct != null ? parseFloat(wastageRow.makingChargePct) : 10;

      const goldValue = weight * ratePerGram;
      const wastageValue = weight * (wastagePct / 100) * ratePerGram;
      const making = (goldValue + wastageValue) * (makingPct / 100);
      const gst = (goldValue + wastageValue + making) * 0.03;
      const unitPrice = Math.round((goldValue + wastageValue + making + gst) * 100) / 100;

      const qty = parseInt(item.quantity, 10) || 1;
      total += unitPrice * qty;
      resolvedItems.push({ productId: product.id, quantity: qty, priceAtPurchase: unitPrice, wastagePctUsed: wastagePct });
    }

    const order = await Order.create(
      { userId: req.user.id, storeId: null, totalAmount: Math.round(total * 100) / 100, status: 'processing' },
      { transaction: t }
    );
    for (const ri of resolvedItems) {
      await OrderItem.create({ ...ri, orderId: order.id }, { transaction: t });
    }
    return order;
  });

  res.status(201).json({ success: true, data: result });
});

// ---- POST /api/orders/:id/return ---- (protected, own order only)
const requestReturn = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order || order.userId !== req.user.id) throw new ApiError(404, 'Order not found.');
  order.status = 'return_requested';
  order.returnReason = req.body.reason || null;
  await order.save();
  res.json({ success: true, data: order });
});

module.exports = { list, create, requestReturn };
