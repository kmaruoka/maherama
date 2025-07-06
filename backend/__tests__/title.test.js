const request = require('supertest');
const app = require('../index');

describe('GET /users/:id/titles', () => {
  it('should return titles for existing user', async () => {
    const res = await request(app).get('/users/1/titles');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
