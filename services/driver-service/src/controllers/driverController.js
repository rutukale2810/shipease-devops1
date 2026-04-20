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
  small_tempo: ['auto', 'small_tempo'],
  truck: [ 'truck']
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
    const { bookingId, pickupLat, pickupLon, dropLat, dropLon, serviceType } = req.body;

    // Get available drivers
    const availableDrivers = await Driver.find({ isAvailable: true });
    const allowedVehicles = SERVICE_TO_VEHICLE[serviceType] || null;
    const eligibleDrivers = allowedVehicles
      ? availableDrivers.filter((driver) => allowedVehicles.includes(driver.vehicleType))
      : availableDrivers;

    if (eligibleDrivers.length === 0) {
      console.warn('⚠️ No available drivers for booking:', bookingId);
      return res.status(200).json({ 
        message: 'No drivers available',
        assigned: false
      });
    }

    // Sort by distance to pickup
    const driversWithDistance = eligibleDrivers.map(driver => ({
      ...driver.toObject(),
      distance: calculateDistance(
        driver.currentLocation.latitude,
        driver.currentLocation.longitude,
        pickupLat,
        pickupLon
      )
    })).sort((a, b) => a.distance - b.distance);

    const assignedDriver = driversWithDistance[0];

    // Update driver availability
    await Driver.findByIdAndUpdate(assignedDriver._id, { isAvailable: false });

    // Notify tracking service
    try {
      await axios.post(`${process.env.TRACKING_SERVICE_URL}/tracking/start/${bookingId}`, {
        driverId: assignedDriver.driverId,
        pickupLat,
        pickupLon,
        dropLat,
        dropLon
      });
    } catch (trackingError) {
      console.warn('⚠️ Tracking start failed:', trackingError.message);
    }

    res.status(200).json({
      message: 'Driver assigned successfully',
      assigned: true,
      driver: {
        driverId: assignedDriver.driverId,
        name: assignedDriver.name,
        phone: assignedDriver.phone,
        vehicleType: assignedDriver.vehicleType,
        distance: assignedDriver.distance.toFixed(2) + ' km'
      }
    });
  } catch (error) {
    console.error('Assign Driver Error:', error);
    res.status(500).json({ message: 'Driver assignment failed', error: error.message });
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
  releaseDriver,
  updateAvailability,
  updateLocation
};
