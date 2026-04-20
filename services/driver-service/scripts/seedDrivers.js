const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const Driver = require('../src/models/Driver');

const seedDrivers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear existing drivers
    await Driver.deleteMany({});

    const drivers = [
      { driverId: uuidv4(), name: 'Raj Kumar', phone: '9876543210', vehicleType: 'bike', currentLocation: { latitude: 28.6139, longitude: 77.2090 } },
      { driverId: uuidv4(), name: 'Priya Singh', phone: '9876543211', vehicleType: 'auto', currentLocation: { latitude: 28.6200, longitude: 77.2200 } },
      { driverId: uuidv4(), name: 'Akshay Verma', phone: '9876543212', vehicleType: 'car', currentLocation: { latitude: 28.6100, longitude: 77.2100 } },
      { driverId: uuidv4(), name: 'Neha Sharma', phone: '9876543213', vehicleType: 'bike', currentLocation: { latitude: 28.6300, longitude: 77.2300 } },
      { driverId: uuidv4(), name: 'Vikram Patel', phone: '9876543214', vehicleType: 'car', currentLocation: { latitude: 28.6050, longitude: 77.2050 } }
    ];

    await Driver.insertMany(drivers);
    console.log('✅ Drivers seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDrivers();
