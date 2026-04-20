const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  pickup: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  drop: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  receiver: {
    name: String,
    phone: String,
    address: String
  },
  parcelWeightKg: {
    type: Number,
    min: 0
  },
  serviceType: {
    type: String,
    enum: ['bike', 'small_tempo', 'truck']
  },
  fareBreakdown: {
    baseFare: Number,
    distanceFare: Number,
    weightFare: Number,
    totalFare: Number
  },
  status: {
    type: String,
    enum: ['pending', 'pending_driver', 'confirmed', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  driverId: String,
  estimatedDistanceKm: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
