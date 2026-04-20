jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn(() => Promise.resolve())
  };
});

const request = require('supertest');
const app = require('../index');

describe('User Service health endpoint', () => {
  it('returns the service status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'UP',
      service: 'user-service'
    });
  });
});