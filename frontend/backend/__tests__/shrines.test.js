const request = require('supertest');
const app = require('../index');

describe('GET /shrines', () => {
  it('should return 200 and an array of shrines', async () => {
    const res = await request(app).get('/shrines');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return shrines with required fields', async () => {
    const res = await request(app).get('/shrines');
    expect(res.statusCode).toBe(200);

    if (res.body.length > 0) {
      const shrine = res.body[0];
      expect(shrine).toHaveProperty('id');
      expect(shrine).toHaveProperty('name');
      expect(shrine).toHaveProperty('lat');
      expect(shrine).toHaveProperty('lng');
      expect(shrine).toHaveProperty('count');
    }
  });
});
