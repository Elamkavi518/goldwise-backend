const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { findNearbyJewelryStores } = require('../services/placesProvider');

// ---- GET /api/location/nearby-stores?lat=&lng=&radius= ----
// Real Places lookup — the frontend only calls this after the browser's own GPS
// permission prompt has been granted, and never receives the API key itself (kept server-
// side only, per the security requirement).
const nearbyStores = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!(lat && lng) && !(lat === 0 || lng === 0)) {
    throw new ApiError(400, 'lat and lng query parameters are required.');
  }
  const radius = Math.min(parseInt(req.query.radius, 10) || 5000, 50000);
  const result = await findNearbyJewelryStores(lat, lng, radius);

  res.json({
    success: true,
    data: result.stores,
    configured: result.configured,
    notice: result.configured
      ? null
      : 'Live nearby-store lookup is not configured yet — set GOOGLE_PLACES_API_KEY in the backend environment. No stores are being invented in the meantime.',
  });
});

module.exports = { nearbyStores };
