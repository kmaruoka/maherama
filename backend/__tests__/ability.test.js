const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Ability APIs', () => {
  beforeEach(async () => {
    await prisma.userAbility.deleteMany();
    await prisma.abilityLog.deleteMany();
    await prisma.user.update({ where: { id: 1 }, data: { ability_points: 200 } });
  });

  it('should list abilities', async () => {
    const res = await request(app).get('/abilities');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should acquire ability and log', async () => {
    const res = await request(app).post('/abilities/1/acquire').set('x-user-id', '1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const log = await prisma.abilityLog.findFirst({ where: { user_id: 1, ability_id: 1 } });
    expect(log).not.toBeNull();
    const ua = await prisma.userAbility.findUnique({ where: { user_id_ability_id: { user_id: 1, ability_id: 1 } } });
    expect(ua).not.toBeNull();
  });

  it('should reset abilities and refund points', async () => {
    await request(app).post('/abilities/1/acquire').set('x-user-id', '1');
    const res = await request(app).post('/user/reset-abilities').set('x-user-id', '1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.refundedPoints).toBe(100);
    const ua = await prisma.userAbility.findMany({ where: { user_id: 1 } });
    expect(ua.length).toBe(0);
    const user = await prisma.user.findUnique({ where: { id: 1 } });
    expect(user.ability_points).toBe(200);
    const logs = await prisma.abilityLog.findMany({ where: { user_id: 1 }, orderBy: { id: 'asc' } });
    expect(logs.length).toBe(2);
    expect(logs[1].points_spent).toBe(-100);
  });
});
