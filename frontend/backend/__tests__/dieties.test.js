const request = require('supertest');
const app = require('../index');

describe('GET /dieties', () => {
  it('should return 200 and an array of dieties', async () => {
    const res = await request(app).get('/dieties');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return dieties with required fields', async () => {
    const res = await request(app).get('/dieties');
    expect(res.statusCode).toBe(200);
    
    if (res.body.length > 0) {
      const diety = res.body[0];
      expect(diety).toHaveProperty('id');
      expect(diety).toHaveProperty('name');
      expect(diety).toHaveProperty('count');
      expect(diety).toHaveProperty('registeredAt');
    }
  });
}); 