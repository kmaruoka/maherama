const request = require('supertest');
const app = require('../index');

describe('GET /user-rankings', () => {
  it('should return 200 and an array of rankings', async () => {
    const res = await request(app).get('/user-rankings');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
