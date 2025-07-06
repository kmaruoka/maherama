import { PrismaClient } from '@prisma/client';

const users = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const shrines = [1, 2, 3, 4, 5, 6];
const dieties = [1, 2, 3];

export async function seedStats(prisma: PrismaClient) {
  // all（通算）
  let rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStats.upsert({
        where: { shrine_id_user_id: { shrine_id: shrineId, user_id: userId } },
        update: { count: 100 * userId + 10 * shrineId, rank: rank },
        create: {
          user_id: userId,
          shrine_id: shrineId,
          count: 100 * userId + 10 * shrineId,
          rank: rank,
        },
      });
      rank++;
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStats.upsert({
        where: { diety_id_user_id: { diety_id: dietyId, user_id: userId } },
        update: { count: 80 * userId + 5 * dietyId, rank: rank },
        create: {
          user_id: userId,
          diety_id: dietyId,
          count: 80 * userId + 5 * dietyId,
          rank: rank,
        },
      });
      rank++;
    }
  }
  // yearly
  rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStatsYearly.upsert({
        where: { shrine_id_user_id: { shrine_id: shrineId, user_id: userId } },
        update: { count: 50 * userId + 5 * shrineId, rank: rank },
        create: {
          user_id: userId,
          shrine_id: shrineId,
          count: 50 * userId + 5 * shrineId,
          rank: rank,
        },
      });
      rank++;
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStatsYearly.upsert({
        where: { diety_id_user_id: { diety_id: dietyId, user_id: userId } },
        update: { count: 40 * userId + 2 * dietyId, rank: rank },
        create: {
          user_id: userId,
          diety_id: dietyId,
          count: 40 * userId + 2 * dietyId,
          rank: rank,
        },
      });
      rank++;
    }
  }
  // monthly
  rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStatsMonthly.upsert({
        where: { shrine_id_user_id: { shrine_id: shrineId, user_id: userId } },
        update: { count: 20 * userId + 2 * shrineId, rank: rank },
        create: {
          user_id: userId,
          shrine_id: shrineId,
          count: 20 * userId + 2 * shrineId,
          rank: rank,
        },
      });
      rank++;
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStatsMonthly.upsert({
        where: { diety_id_user_id: { diety_id: dietyId, user_id: userId } },
        update: { count: 15 * userId + dietyId, rank: rank },
        create: {
          user_id: userId,
          diety_id: dietyId,
          count: 15 * userId + dietyId,
          rank: rank,
        },
      });
      rank++;
    }
  }
  // weekly
  rank = 1;
  for (const userId of users) {
    for (const shrineId of shrines) {
      await prisma.shrinePrayStatsWeekly.upsert({
        where: { shrine_id_user_id: { shrine_id: shrineId, user_id: userId } },
        update: { count: 5 * userId + shrineId, rank: rank },
        create: {
          user_id: userId,
          shrine_id: shrineId,
          count: 5 * userId + shrineId,
          rank: rank,
        },
      });
      rank++;
    }
    rank = 1;
    for (const dietyId of dieties) {
      await prisma.dietyPrayStatsWeekly.upsert({
        where: { diety_id_user_id: { diety_id: dietyId, user_id: userId } },
        update: { count: 3 * userId + dietyId, rank: rank },
        create: {
          user_id: userId,
          diety_id: dietyId,
          count: 3 * userId + dietyId,
          rank: rank,
        },
      });
      rank++;
    }
  }
}
