const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/Booking');

const SERVICE_RULES = {
  bike: {
    minWeight: 0,
    maxWeight: 5,
    baseFare: 60,
    perKmRate: 9,
    perKgRate: 4
  },
  small_tempo: {
    minWeight: 5,
    maxWeight: 50,
    baseFare: 140,
    perKmRate: 14,
    perKgRate: 3
  },
  truck: {
    minWeight: 50,
    maxWeight: 500,
    baseFare: 320,
    perKmRate: 22,
    perKgRate: 2
  }
};

const toNumber = (value) => Number(value);

const isValidLocation = (location) => {
  if (!location || typeof location !== 'object') {
    return false;
  }

  const latitude = toNumber(location.latitude);
  const longitude = toNumber(location.longitude);

  return (
    typeof location.name === 'string' &&
    location.name.trim().length > 0 &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
};

const isValidPhone = (phone) => /^\d{10}$/.test(String(phone || '').trim());

const calculateDistanceKm = (pickup, drop) => {
  const lat1 = toNumber(pickup.latitude);
  const lon1 = toNumber(pickup.longitude);
  const lat2 = toNumber(drop.latitude);
  const lon2 = toNumber(drop.longitude);

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

const round2 = (value) => Math.round(value * 100) / 100;

const createBooking = async (req, res) => {
  try {
    const { userId, pickup, drop, receiver, parcelWeightKg, serviceType } = req.body;

    if (!userId || !pickup || !drop || !receiver || parcelWeightKg === undefined || !serviceType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!isValidLocation(pickup) || !isValidLocation(drop)) {
      return res.status(400).json({ message: 'Invalid location data' });
    }

    if (!receiver.name || !isValidPhone(receiver.phone)) {
      return res.status(400).json({ message: 'Invalid receiver data' });
    }

    const parsedWeight = toNumber(parcelWeightKg);
    const rule = SERVICE_RULES[serviceType];

    if (!rule) {
      return res.status(400).json({ message: 'Unsupported service type' });
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ message: 'parcelWeightKg must be a positive number' });
    }

    if (parsedWeight < rule.minWeight || parsedWeight > rule.maxWeight) {
      return res.status(422).json({
        message: `Selected service supports ${rule.minWeight}-${rule.maxWeight} kg only`
      });
    }

    const estimatedDistanceKm = round2(calculateDistanceKm(pickup, drop));
    const fareBreakdown = {
      baseFare: rule.baseFare,
      distanceFare: round2(estimatedDistanceKm * rule.perKmRate),
      weightFare: round2(parsedWeight * rule.perKgRate)
    };
    fareBreakdown.totalFare = round2(fareBreakdown.baseFare + fareBreakdown.distanceFare + fareBreakdown.weightFare);

    const normalizedReceiver = {
      name: String(receiver.name).trim(),
      phone: String(receiver.phone).trim(),
      address: drop.name
    };

    const bookingId = uuidv4();
    const booking = new Booking({
      bookingId,
      userId,
      pickup,
      drop,
      receiver: normalizedReceiver,
      parcelWeightKg: parsedWeight,
      serviceType,
      estimatedDistanceKm,
      fareBreakdown,
      status: 'pending'
    });

    await booking.save();

    // Trigger driver assignment
    try {
      const assignmentResponse = await axios.post(`${process.env.DRIVER_SERVICE_URL}/drivers/assign/${bookingId}`, {
        bookingId,
        userId,
        serviceType,
        parcelWeightKg: parsedWeight,
        pickupLat: pickup.latitude,
        pickupLon: pickup.longitude,
        dropLat: drop.latitude,
        dropLon: drop.longitude
      });

      if (assignmentResponse.data?.assigned) {
        booking.status = 'confirmed';
        if (assignmentResponse.data.driver?.driverId) {
          booking.driverId = assignmentResponse.data.driver.driverId;
        }
      } else {
        booking.status = 'pending_driver';
      }

      booking.updatedAt = new Date();
      await booking.save();
    } catch (driverError) {
      console.warn('⚠️ Driver assignment failed:', driverError.message);
      booking.status = 'pending_driver';
      booking.updatedAt = new Date();
      await booking.save();
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Booking creation failed', error: error.message });
  }
};

const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error('Get Booking Error:', error);
    res.status(500).json({ message: 'Failed to fetch booking', error: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Get User Bookings Error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['pending', 'pending_driver', 'confirmed', 'in_transit', 'delivered', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status' });
    }

    const booking = await Booking.findOneAndUpdate(
      { bookingId },
      {
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({
      message: 'Booking status updated',
      booking
    });
  } catch (error) {
    console.error('Update Booking Status Error:', error);
    res.status(500).json({ message: 'Failed to update booking status', error: error.message });
  }
};

module.exports = {
  createBooking,
  getBooking,
  getUserBookings,
  updateBookingStatus
};
