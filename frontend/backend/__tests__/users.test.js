const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

describe('レベル1ユーザーの参拝距離・回数API値と定義の一致テスト', () => {
  let level1Def;
  beforeAll(async () => {
    level1Def = await prisma.levelMaster.findUnique({ where: { level: 1 } });
  });

  test('/users/1/level-infoのstatsとlevelMaster定義が一致する', async () => {
    const res = await request(app).get('/users/1/level-info');
    expect(res.statusCode).toBe(200);
    expect(res.body.stats.pray_distance).toBe(level1Def.pray_distance);
    expect(res.body.stats.worship_count).toBe(level1Def.worship_count);
  });

  test('/users/1/pray-distanceの値とlevelMaster定義が一致する', async () => {
    const res = await request(app).get('/users/1/pray-distance');
    expect(res.statusCode).toBe(200);
    expect(res.body.pray_distance).toBe(level1Def.pray_distance);
  });
});
