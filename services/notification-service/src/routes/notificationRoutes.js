const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.post('/send', notificationController.sendNotification);
router.get('/user/:userId', notificationController.getUserNotifications);
router.get('/:bookingId', notificationController.getNotifications);

module.exports = router;
