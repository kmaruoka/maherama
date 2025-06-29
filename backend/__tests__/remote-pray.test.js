const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('POST /shrines/:id/remote-pray', () => {
  beforeEach(async () => {
    await prisma.remotePray.deleteMany();
  });

  it('should return 400 for non-subscribed user (slots=0)', async () => {
    const res = await request(app)
      .post('/shrines/1/remote-pray')
      .set('x-user-id', '3'); // ユーザーID 3は無課金
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('遥拝は1週間に0回までです');
  });

  it('should return 200 for subscribed user with 1 slot', async () => {
    const res = await request(app)
      .post('/shrines/1/remote-pray')
      .set('x-user-id', '2'); // ユーザーID 2は1口課金
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('should return 400 when exceeding slot limit', async () => {
    await request(app)
      .post('/shrines/1/remote-pray')
      .set('x-user-id', '2');
    const res = await request(app)
      .post('/shrines/2/remote-pray')
      .set('x-user-id', '2');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('遥拝は1週間に1回までです');
  });

  it('should allow 3 remote-prays for user with 3 slots', async () => {
    await request(app).post('/shrines/1/remote-pray').set('x-user-id', '1');
    await request(app).post('/shrines/2/remote-pray').set('x-user-id', '1');
    const res = await request(app).post('/shrines/3/remote-pray').set('x-user-id', '1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
}); 