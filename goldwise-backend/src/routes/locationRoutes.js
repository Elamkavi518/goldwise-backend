const express = require('express');
const ctrl = require('../controllers/locationController');

const router = express.Router();
router.get('/nearby-stores', ctrl.nearbyStores); // public — the store finder is a discovery feature

module.exports = router;
