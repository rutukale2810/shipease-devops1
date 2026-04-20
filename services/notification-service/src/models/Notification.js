const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    unique: true,
    required: true
  },
  bookingId: {
    type: String,
    required: true
  },
  userId: String,
  type: {
    type: String,
    enum: ['status_update', 'driver_assigned', 'delivery_complete'],
    default: 'status_update'
  },
  message: String,
  channels: {
    console: { sent: Boolean, timestamp: Date },
    email: { sent: Boolean, timestamp: Date, recipient: String }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
