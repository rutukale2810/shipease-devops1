const mongoose = require('mongoose');

const TrackingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  driverId: String,
  currentStatus: {
    type: String,
    enum: ['Order Placed', 'Picked Up', 'In Transit', 'Delivered'],
    default: 'Order Placed'
  },
  currentLocation: {
    latitude: Number,
    longitude: Number
  },
  destinationLocation: {
    latitude: Number,
    longitude: Number
  },
  pickupLocation: {
    latitude: Number,
    longitude: Number
  },
  routePoints: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }],
  statusHistory: [{
    status: String,
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number
    }
  }],
  startedAt: Date,
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  simulationTimer: String // Stores interval ID for cleanup
});

module.exports = mongoose.model('Tracking', TrackingSchema);
