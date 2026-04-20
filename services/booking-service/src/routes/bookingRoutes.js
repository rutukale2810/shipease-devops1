const express = require('express');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.post('/', bookingController.createBooking);
router.get('/user/:userId', bookingController.getUserBookings);
router.patch('/:bookingId/status', bookingController.updateBookingStatus);
router.get('/:bookingId', bookingController.getBooking);

module.exports = router;
