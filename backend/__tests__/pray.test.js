const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('POST /shrines/:id/pray', () => {
  beforeEach(async () => {
    await prisma.shrinePray.deleteMany();
  });
  it('should return 404 for non-existent shrine', async () => {
    const res = await request(app).post('/shrines/99999/pray');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 200 and increment count for existing shrine', async () => {
    // まず神社の現在の参拝数と位置情報を取得
    const shrineRes = await request(app).get('/shrines/1');
    expect(shrineRes.statusCode).toBe(200);
    const originalCount = shrineRes.body.count;

    const userBefore = await request(app).get('/users/1');
    const beforeExp = userBefore.body.exp;

    // 参拝実行
    const prayRes = await request(app)
      .post('/shrines/1/pray')
      .send({ lat: shrineRes.body.lat, lng: shrineRes.body.lng });
    expect(prayRes.statusCode).toBe(200);
    expect(prayRes.body).toHaveProperty('success', true);
    expect(prayRes.body).toHaveProperty('count');
    expect(prayRes.body.count).toBe(originalCount + 1);

    const userAfter = await request(app).get('/users/1');
    expect(userAfter.body.exp).toBe(beforeExp + 10);

    const logs = await prisma.shrinePray.findMany();
    expect(logs.length).toBe(1);
    expect(logs[0].shrine_id).toBe(1);
    expect(logs[0].user_id).toBe(1);
  });
});
