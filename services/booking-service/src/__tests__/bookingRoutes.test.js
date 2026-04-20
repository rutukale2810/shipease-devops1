jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn(() => Promise.resolve())
  };
});

jest.mock('axios', () => ({
  post: jest.fn()
}));

jest.mock('../models/Booking', () => {
  const saveMock = jest.fn().mockResolvedValue(undefined);

  const Booking = jest.fn().mockImplementation((data) => ({
    _id: 'mock-booking-id',
    ...data,
    save: saveMock
  }));

  Booking.findOne = jest.fn();
  Booking.find = jest.fn();
  Booking.__saveMock = saveMock;

  return Booking;
});

const request = require('supertest');
const axios = require('axios');
const app = require('../index');
const Booking = require('../models/Booking');

describe('Booking Service routes', () => {
  const validPayload = {
    userId: 'user-123',
    pickup: {
      name: 'Airport',
      latitude: 28.5562,
      longitude: 77.1
    },
    drop: {
      name: 'City Center',
      latitude: 28.6273,
      longitude: 77.1854
    },
    receiver: {
      name: 'Aman',
      phone: '9876543210'
    },
    parcelWeightKg: 3,
    serviceType: 'bike'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({
      data: {
        assigned: true,
        driver: { driverId: 'driver-42' }
      }
    });
  });

  it('rejects missing receiver details', async () => {
    const payload = { ...validPayload };
    delete payload.receiver;

    const response = await request(app)
      .post('/bookings')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Missing required fields');
  });

  it('rejects weight-service mismatch', async () => {
    const response = await request(app)
      .post('/bookings')
      .send({
        ...validPayload,
        parcelWeightKg: 40,
        serviceType: 'bike'
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toContain('Selected service supports');
  });

  it('creates booking with receiver, fare and assignment payload', async () => {
    const response = await request(app)
      .post('/bookings')
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({
      userId: validPayload.userId,
      serviceType: 'bike',
      receiver: {
        name: validPayload.receiver.name,
        phone: validPayload.receiver.phone
      }
    });
    expect(response.body.booking.fareBreakdown.totalFare).toBeGreaterThan(0);
    expect(response.body.booking.status).toBe('confirmed');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/drivers/assign/'),
      expect.objectContaining({
        serviceType: 'bike',
        parcelWeightKg: 3
      })
    );
    expect(Booking).toHaveBeenCalled();
    expect(Booking.__saveMock).toHaveBeenCalled();
  });
});