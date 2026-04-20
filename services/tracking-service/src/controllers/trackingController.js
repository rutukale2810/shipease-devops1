const axios = require('axios');
const Tracking = require('../models/Tracking');

const activeSimulations = new Map();
const TICK_MS = 5000;
const PROGRESS_STEP = 0.2;

// Helper to interpolate position between two points
const interpolateLocation = (start, end, progress) => {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * progress,
    longitude: start.longitude + (end.longitude - start.longitude) * progress
  };
};

// Helper to notify other services
const notifyStatusChange = async (bookingId, status, location) => {
  try {
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notifications/send`, {
      bookingId,
      status,
      location
    });
  } catch (error) {
    console.warn('⚠️ Notification failed:', error.message);
  }
};

const TRACKING_TO_BOOKING_STATUS = {
  'Order Placed': 'confirmed',
  'Picked Up': 'in_transit',
  'In Transit': 'in_transit',
  Delivered: 'delivered'
};

const syncBookingStatus = async (bookingId, trackingStatus) => {
  const mappedStatus = TRACKING_TO_BOOKING_STATUS[trackingStatus];
  if (!mappedStatus || !process.env.BOOKING_SERVICE_URL) {
    return;
  }

  try {
    await axios.patch(`${process.env.BOOKING_SERVICE_URL}/bookings/${bookingId}/status`, {
      status: mappedStatus
    });
  } catch (error) {
    console.warn('⚠️ Booking status sync failed:', error.message);
  }
};

const getStatusFromProgress = (progress) => {
  if (progress < 0.2) return 'Order Placed';
  if (progress < 0.4) return 'Picked Up';
  if (progress < 1) return 'In Transit';
  return 'Delivered';
};

// Simulate delivery journey with smoother and faster demo progression
const simulateTracking = (bookingId) => {
  if (activeSimulations.has(bookingId)) {
    return;
  }

  let progress = 0;

  const interval = setInterval(async () => {
    try {
      const tracking = await Tracking.findOne({ bookingId });
      if (!tracking) {
        clearInterval(interval);
        activeSimulations.delete(bookingId);
        return;
      }

      progress = Math.min(1, progress + PROGRESS_STEP);
      const status = getStatusFromProgress(progress);

      if (progress < 0.2) {
        tracking.currentLocation = tracking.pickupLocation;
      } else {
        const transitProgress = Math.min(1, (progress - 0.2) / 0.8);
        tracking.currentLocation = interpolateLocation(
          tracking.pickupLocation,
          tracking.destinationLocation,
          transitProgress
        );
      }

      tracking.currentStatus = status;
      tracking.updatedAt = new Date();
      tracking.routePoints.push({
        latitude: tracking.currentLocation.latitude,
        longitude: tracking.currentLocation.longitude,
        timestamp: new Date()
      });

      const previousStatus = tracking.statusHistory[tracking.statusHistory.length - 1]?.status;
      if (previousStatus !== status) {
        tracking.statusHistory.push({
          status,
          timestamp: new Date(),
          location: tracking.currentLocation
        });
        await syncBookingStatus(bookingId, status);
        await notifyStatusChange(bookingId, status, tracking.currentLocation);
      }

      if (status === 'Delivered') {
        tracking.currentLocation = tracking.destinationLocation;
        if (!tracking.deliveredAt) {
          tracking.deliveredAt = new Date();
        }

        if (tracking.driverId && process.env.DRIVER_SERVICE_URL) {
          try {
            await axios.post(`${process.env.DRIVER_SERVICE_URL}/drivers/release`, {
              driverId: tracking.driverId,
              latitude: tracking.destinationLocation?.latitude,
              longitude: tracking.destinationLocation?.longitude
            });
          } catch (releaseError) {
            console.warn('⚠️ Driver release failed:', releaseError.message);
          }
        }
      }

      await tracking.save();

      if (status === 'Delivered') {
        clearInterval(interval);
        activeSimulations.delete(bookingId);
        console.log(`✅ Delivery completed for ${bookingId}`);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      clearInterval(interval);
      activeSimulations.delete(bookingId);
    }
  }, TICK_MS);

  activeSimulations.set(bookingId, interval);
};

const startTracking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { driverId, pickupLat, pickupLon, dropLat, dropLon } = req.body;

    let tracking = await Tracking.findOne({ bookingId });

    if (!tracking) {
      tracking = new Tracking({
        bookingId,
        driverId,
        pickupLocation: { latitude: pickupLat, longitude: pickupLon },
        destinationLocation: { latitude: dropLat || pickupLat + 0.05, longitude: dropLon || pickupLon + 0.05 },
        currentLocation: { latitude: pickupLat, longitude: pickupLon },
        currentStatus: 'Order Placed',
        startedAt: new Date(),
        statusHistory: [{
          status: 'Order Placed',
          timestamp: new Date(),
          location: { latitude: pickupLat, longitude: pickupLon }
        }]
      });
    }

    await tracking.save();
    await notifyStatusChange(bookingId, 'Order Placed', tracking.currentLocation);

    // Start simulation for this booking (guarded by activeSimulations map).
    simulateTracking(bookingId);

    res.status(200).json({
      message: 'Tracking started',
      tracking
    });
  } catch (error) {
    console.error('Start Tracking Error:', error);
    res.status(500).json({ message: 'Failed to start tracking', error: error.message });
  }
};

const getTracking = async (req, res) => {
  try {
    const tracking = await Tracking.findOne({ bookingId: req.params.bookingId });

    if (!tracking) {
      return res.status(404).json({ message: 'Tracking not found' });
    }

    res.status(200).json({ tracking });
  } catch (error) {
    console.error('Get Tracking Error:', error);
    res.status(500).json({ message: 'Failed to fetch tracking', error: error.message });
  }
};

module.exports = {
  startTracking,
  getTracking
};
