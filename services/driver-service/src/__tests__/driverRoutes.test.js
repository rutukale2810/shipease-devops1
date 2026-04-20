jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn(() => Promise.resolve())
  };
});

jest.mock('../models/Driver', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

const request = require('supertest');
const app = require('../index');
const Driver = require('../models/Driver');

describe('Driver Service routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a driver profile by driver id', async () => {
    Driver.findOne.mockResolvedValue({
      driverId: 'driver-123',
      name: 'Aman Singh',
      phone: '9999999999'
    });

    const response = await request(app).get('/drivers/profile/driver-123');

    expect(response.status).toBe(200);
    expect(response.body.driver).toMatchObject({
      driverId: 'driver-123',
      name: 'Aman Singh'
    });
  });

  it('updates driver location', async () => {
    Driver.findOneAndUpdate.mockResolvedValue({
      driverId: 'driver-123',
      currentLocation: {
        latitude: 28.5,
        longitude: 77.2
      }
    });

    const response = await request(app)
      .patch('/drivers/driver-123/location')
      .send({ latitude: 28.5, longitude: 77.2 });

    expect(response.status).toBe(200);
    expect(Driver.findOneAndUpdate).toHaveBeenCalledWith(
      { driverId: 'driver-123' },
      { currentLocation: { latitude: 28.5, longitude: 77.2 } },
      { new: true }
    );
    expect(response.body.driver.currentLocation).toMatchObject({
      latitude: 28.5,
      longitude: 77.2
    });
  });

  it('rejects invalid location values', async () => {
    const response = await request(app)
      .patch('/drivers/driver-123/location')
      .send({ latitude: 'abc', longitude: 77.2 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('latitude and longitude must be valid numbers');
  });

  it('assigns only compatible vehicle for selected service', async () => {
    Driver.find.mockResolvedValue([
      {
        _id: 'bike-driver-id',
        driverId: 'bike-driver',
        name: 'Bike Driver',
        phone: '9990001111',
        vehicleType: 'bike',
        currentLocation: { latitude: 28.5, longitude: 77.1 },
        toObject() {
          return this;
        }
      },
      {
        _id: 'auto-driver-id',
        driverId: 'auto-driver',
        name: 'Auto Driver',
        phone: '9990002222',
        vehicleType: 'auto',
        currentLocation: { latitude: 28.52, longitude: 77.12 },
        toObject() {
          return this;
        }
      }
    ]);
    Driver.findByIdAndUpdate.mockResolvedValue({});

    const response = await request(app)
      .post('/drivers/assign/booking-123')
      .send({
        bookingId: 'booking-123',
        serviceType: 'small_tempo',
        pickupLat: 28.55,
        pickupLon: 77.1,
        dropLat: 28.6,
        dropLon: 77.2
      });

    expect(response.status).toBe(200);
    expect(response.body.assigned).toBe(true);
    expect(response.body.driver.vehicleType).toBe('auto');
    expect(response.body.driver.driverId).toBe('auto-driver');
    expect(Driver.findByIdAndUpdate).toHaveBeenCalledWith('auto-driver-id', { isAvailable: false });
  });
});