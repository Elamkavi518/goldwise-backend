const axios = require('axios');
const env = require('../config/env');

// Real Google Places (New) Nearby Search — requires YOUR OWN key with billing enabled on
// Google Cloud (Places API has a monthly free credit, then a real per-request cost).
// This function returns [] rather than inventing stores when no key is configured, per
// the "never generate or invent stores" rule — the frontend must show that plainly.
async function findNearbyJewelryStores(lat, lng, radiusMeters = 5000) {
  if (!env.places.apiKey) {
    return { configured: false, stores: [] };
  }
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    includedTypes: ['jewelry_store'],
    maxResultCount: 20,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
    },
  };
  const { data } = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.places.apiKey,
      // Field mask keeps the bill down — only request what the UI actually shows.
      'X-Goog-FieldMask': [
        'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
        'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.rating',
        'places.userRatingCount', 'places.regularOpeningHours', 'places.websiteUri',
        'places.googleMapsUri', 'places.businessStatus',
      ].join(','),
    },
    timeout: 8000,
  });

  const stores = (data.places || []).map(p => ({
    placeId: p.id,
    name: p.displayName?.text || 'Unnamed store',
    address: p.formattedAddress || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    ratingCount: p.userRatingCount ?? null,
    openingHours: p.regularOpeningHours?.weekdayDescriptions || null,
    website: p.websiteUri || null,
    mapsUrl: p.googleMapsUri || null,
    businessStatus: p.businessStatus || null,
    source: 'google_places',
  }));
  return { configured: true, stores };
}

module.exports = { findNearbyJewelryStores };
