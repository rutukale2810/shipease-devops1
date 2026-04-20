const express = require('express');
const trackingController = require('../controllers/trackingController');

const router = express.Router();

router.post('/start/:bookingId', trackingController.startTracking);
router.get('/:bookingId', trackingController.getTracking);

module.exports = router;
