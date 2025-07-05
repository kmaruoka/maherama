import { PrismaClient } from '@prisma/client';

const users = [3, 5];
const shrines = [1, 2, 3, 4, 5, 6];
const dieties = [1, 2, 3];

export async function seedStats(prisma: PrismaClient) {
  // all（通算）
  let rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStats.create({
        data: {
          user_id: userId,
          shrine_id: shrineId,
          count: 100 * userId + 10 * shrineId,
          rank: rank++,
        },
      });
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStats.create({
        data: {
          user_id: userId,
          diety_id: dietyId,
          count: 80 * userId + 5 * dietyId,
          rank: rank++,
        },
      });
    }
  }
  // yearly
  rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStatsYearly.create({
        data: {
          user_id: userId,
          shrine_id: shrineId,
          count: 50 * userId + 5 * shrineId,
          rank: rank++,
        },
      });
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStatsYearly.create({
        data: {
          user_id: userId,
          diety_id: dietyId,
          count: 40 * userId + 2 * dietyId,
          rank: rank++,
        },
      });
    }
  }
  // monthly
  rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStatsMonthly.create({
        data: {
          user_id: userId,
          shrine_id: shrineId,
          count: 20 * userId + 2 * shrineId,
          rank: rank++,
        },
      });
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStatsMonthly.create({
        data: {
          user_id: userId,
          diety_id: dietyId,
          count: 15 * userId + dietyId,
          rank: rank++,
        },
      });
    }
  }
  // weekly
  rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStatsWeekly.create({
        data: {
          user_id: userId,
          shrine_id: shrineId,
          count: 5 * userId + shrineId,
          rank: rank++,
        },
      });
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStatsWeekly.create({
        data: {
          user_id: userId,
          diety_id: dietyId,
          count: 3 * userId + dietyId,
          rank: rank++,
        },
      });
    }
  }
}
