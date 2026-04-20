const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'car', 'two_wheeler', 'small_tempo', 'truck'],
    default: 'two_wheeler'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    latitude: { type: Number, default: 28.6139 },
    longitude: { type: Number, default: 77.2090 }
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 1,
    max: 5
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Driver', DriverSchema);
