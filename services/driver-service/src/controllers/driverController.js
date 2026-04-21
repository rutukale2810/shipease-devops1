const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Driver = require('../models/Driver');

// Helper to calculate distance using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const SERVICE_TO_VEHICLE = {
  bike: ['bike', 'two_wheeler'],
  small_tempo: ['small_tempo', 'auto'],
  truck: ['truck']
};

const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.status(200).json({ drivers });
  } catch (error) {
    console.error('Get Drivers Error:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
};

const getDriverProfile = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({ driver });
  } catch (error) {
    console.error('Get Driver Profile Error:', error);
    res.status(500).json({ message: 'Failed to fetch driver profile', error: error.message });
  }
};

const createDriver = async (req, res) => {
  try {
    const { name, phone, vehicleType } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const driverId = uuidv4();
    const driver = new Driver({
      driverId,
      name,
      phone,
      vehicleType: vehicleType || 'bike'
    });

    await driver.save();

    res.status(201).json({
      message: 'Driver created successfully',
      driver
    });
  } catch (error) {
    console.error('Create Driver Error:', error);
    res.status(500).json({ message: 'Driver creation failed', error: error.message });
  }
};

const assignDriver = async (req, res) => {
  try {
    const { bookingId, pickupLat, pickupLon, dropLat, dropLon, serviceType, parcelWeightKg, pickupName, dropName } = req.body;

    const availableDrivers = await Driver.find({ isAvailable: true });
    const allowedVehicles = SERVICE_TO_VEHICLE[serviceType] || null;
    const eligibleDrivers = allowedVehicles
      ? availableDrivers.filter((driver) => allowedVehicles.includes(driver.vehicleType))
      : availableDrivers;

    if (eligibleDrivers.length === 0) {
      console.warn('⚠️ No available drivers for booking:', bookingId);
      return res.status(200).json({ message: 'No drivers available', assigned: false });
    }

    // Sort by distance to pickup, pick nearest
    const driversWithDistance = eligibleDrivers.map(driver => ({
      ...driver.toObject(),
      _mongoId: driver._id,
      distance: calculateDistance(
        driver.currentLocation.latitude,
        driver.currentLocation.longitude,
        pickupLat,
        pickupLon
      )
    })).sort((a, b) => a.distance - b.distance);

    const nearest = driversWithDistance[0];

    // Send request to nearest driver (push to pendingBookings)
    await Driver.findByIdAndUpdate(nearest._mongoId, {
      $push: {
        pendingBookings: {
          bookingId,
          serviceType,
          parcelWeightKg,
          pickupName: pickupName || '',
          dropName: dropName || '',
          pickupLat,
          pickupLon,
          dropLat,
          dropLon,
          requestedAt: new Date()
        }
      }
    });

    res.status(200).json({
      message: 'Request sent to driver',
      assigned: false,
      requested: true,
      driver: {
        driverId: nearest.driverId,
        name: nearest.name,
        vehicleType: nearest.vehicleType,
        distance: nearest.distance.toFixed(2) + ' km'
      }
    });
  } catch (error) {
    console.error('Assign Driver Error:', error);
    res.status(500).json({ message: 'Driver assignment failed', error: error.message });
  }
};

const respondToBooking = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { bookingId, accept } = req.body;

    const driver = await Driver.findOne({ driverId });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const pending = driver.pendingBookings.find(b => b.bookingId === bookingId);
    if (!pending) return res.status(404).json({ message: 'Booking request not found' });

    // Remove from pending regardless of accept/reject
    await Driver.findOneAndUpdate(
      { driverId },
      { $pull: { pendingBookings: { bookingId } } }
    );

    if (!accept) {
      return res.status(200).json({ message: 'Booking rejected' });
    }

    // Mark driver unavailable
    await Driver.findOneAndUpdate({ driverId }, { isAvailable: false });

    // Update booking status to confirmed + set driverId
    try {
      await axios.patch(`${process.env.BOOKING_SERVICE_URL}/bookings/${bookingId}/status`, {
        status: 'confirmed',
        driverId
      });
    } catch (err) {
      console.warn('⚠️ Booking status update failed:', err.message);
    }

    // Start tracking
    try {
      await axios.post(`${process.env.TRACKING_SERVICE_URL}/tracking/start/${bookingId}`, {
        driverId,
        pickupLat: pending.pickupLat,
        pickupLon: pending.pickupLon,
        dropLat: pending.dropLat,
        dropLon: pending.dropLon
      });
    } catch (err) {
      console.warn('⚠️ Tracking start failed:', err.message);
    }

    res.status(200).json({ message: 'Booking accepted', bookingId, driverId });
  } catch (error) {
    console.error('Respond To Booking Error:', error);
    res.status(500).json({ message: 'Failed to respond to booking', error: error.message });
  }
};

const releaseDriver = async (req, res) => {
  try {
    const { driverId, latitude, longitude } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: 'driverId is required' });
    }

    const updates = {
      isAvailable: true,
      $inc: { totalDeliveries: 1 }
    };

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      updates.currentLocation = { latitude, longitude };
    }

    const driver = await Driver.findOneAndUpdate(
      { driverId },
      updates,
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({
      message: 'Driver released successfully',
      driver
    });
  } catch (error) {
    console.error('Release Driver Error:', error);
    res.status(500).json({ message: 'Failed to release driver', error: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { latitude, longitude } = req.body;

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      return res.status(400).json({ message: 'latitude and longitude must be valid numbers' });
    }

    const driver = await Driver.findOneAndUpdate(
      { driverId },
      { currentLocation: { latitude: parsedLatitude, longitude: parsedLongitude } },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({
      message: 'Driver location updated',
      driver
    });
  } catch (error) {
    console.error('Update Location Error:', error);
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable must be boolean' });
    }

    const driver = await Driver.findOneAndUpdate(
      { driverId },
      { isAvailable },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({
      message: 'Driver availability updated',
      driver
    });
  } catch (error) {
    console.error('Update Availability Error:', error);
    res.status(500).json({ message: 'Failed to update availability', error: error.message });
  }
};

module.exports = {
  getAllDrivers,
  getDriverProfile,
  createDriver,
  assignDriver,
  respondToBooking,
  releaseDriver,
  updateAvailability,
  updateLocation
};
