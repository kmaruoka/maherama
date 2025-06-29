const request = require('supertest');
const app = require('../index');

describe('POST /shrines/:id/pray', () => {
  it('should return 404 for non-existent shrine', async () => {
    const res = await request(app).post('/shrines/99999/pray');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 200 and increment count for existing shrine', async () => {
    // まず神社の現在の参拝数を取得
    const shrineRes = await request(app).get('/shrines/1');
    expect(shrineRes.statusCode).toBe(200);
    const originalCount = shrineRes.body.count;

    // 参拝実行
    const prayRes = await request(app).post('/shrines/1/pray');
    expect(prayRes.statusCode).toBe(200);
    expect(prayRes.body).toHaveProperty('success', true);
    expect(prayRes.body).toHaveProperty('count');
    expect(prayRes.body.count).toBe(originalCount + 1);
  });
}); 