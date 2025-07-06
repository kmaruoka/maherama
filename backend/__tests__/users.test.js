const request = require('supertest');
const app = require('../index');

describe('GET /users/:id', () => {
  it('should return 404 for non-existent user', async () => {
    const res = await request(app).get('/users/99999');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 200 for existing user', async () => {
    // seedデータに存在するユーザーID（1）をテスト
    const res = await request(app).get('/users/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('level');
    expect(res.body).toHaveProperty('exp');
    expect(res.body).toHaveProperty('abilityPoints');
    expect(res.body).toHaveProperty('followingCount');
    expect(res.body).toHaveProperty('followerCount');
    expect(res.body).toHaveProperty('topShrines');
    expect(res.body).toHaveProperty('topDieties');
  });
}); 