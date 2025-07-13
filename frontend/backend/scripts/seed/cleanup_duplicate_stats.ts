import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  // ShrinePrayStats
  const shrineStats = await prisma.shrinePrayStats.findMany({});
  const seenShrine = new Set<string>();
  for (const stat of shrineStats) {
    const key = `${stat.shrine_id}_${stat.user_id}`;
    if (seenShrine.has(key)) {
      await prisma.shrinePrayStats.delete({ where: { id: stat.id } });
    } else {
      seenShrine.add(key);
    }
  }

  // DietyPrayStats
  const dietyStats = await prisma.dietyPrayStats.findMany({});
  const seenDiety = new Set<string>();
  for (const stat of dietyStats) {
    const key = `${stat.diety_id}_${stat.user_id}`;
    if (seenDiety.has(key)) {
      await prisma.dietyPrayStats.delete({ where: { id: stat.id } });
    } else {
      seenDiety.add(key);
    }
  }

  // ShrinePrayStatsYearly
  const shrineStatsYearly = await prisma.shrinePrayStatsYearly.findMany({});
  const seenShrineYearly = new Set<string>();
  for (const stat of shrineStatsYearly) {
    const key = `${stat.shrine_id}_${stat.user_id}`;
    if (seenShrineYearly.has(key)) {
      await prisma.shrinePrayStatsYearly.delete({ where: { id: stat.id } });
    } else {
      seenShrineYearly.add(key);
    }
  }

  // DietyPrayStatsYearly
  const dietyStatsYearly = await prisma.dietyPrayStatsYearly.findMany({});
  const seenDietyYearly = new Set<string>();
  for (const stat of dietyStatsYearly) {
    const key = `${stat.diety_id}_${stat.user_id}`;
    if (seenDietyYearly.has(key)) {
      await prisma.dietyPrayStatsYearly.delete({ where: { id: stat.id } });
    } else {
      seenDietyYearly.add(key);
    }
  }

  // ShrinePrayStatsMonthly
  const shrineStatsMonthly = await prisma.shrinePrayStatsMonthly.findMany({});
  const seenShrineMonthly = new Set<string>();
  for (const stat of shrineStatsMonthly) {
    const key = `${stat.shrine_id}_${stat.user_id}`;
    if (seenShrineMonthly.has(key)) {
      await prisma.shrinePrayStatsMonthly.delete({ where: { id: stat.id } });
    } else {
      seenShrineMonthly.add(key);
    }
  }

  // DietyPrayStatsMonthly
  const dietyStatsMonthly = await prisma.dietyPrayStatsMonthly.findMany({});
  const seenDietyMonthly = new Set<string>();
  for (const stat of dietyStatsMonthly) {
    const key = `${stat.diety_id}_${stat.user_id}`;
    if (seenDietyMonthly.has(key)) {
      await prisma.dietyPrayStatsMonthly.delete({ where: { id: stat.id } });
    } else {
      seenDietyMonthly.add(key);
    }
  }

  // ShrinePrayStatsWeekly
  const shrineStatsWeekly = await prisma.shrinePrayStatsWeekly.findMany({});
  const seenShrineWeekly = new Set<string>();
  for (const stat of shrineStatsWeekly) {
    const key = `${stat.shrine_id}_${stat.user_id}`;
    if (seenShrineWeekly.has(key)) {
      await prisma.shrinePrayStatsWeekly.delete({ where: { id: stat.id } });
    } else {
      seenShrineWeekly.add(key);
    }
  }

  // DietyPrayStatsWeekly
  const dietyStatsWeekly = await prisma.dietyPrayStatsWeekly.findMany({});
  const seenDietyWeekly = new Set<string>();
  for (const stat of dietyStatsWeekly) {
    const key = `${stat.diety_id}_${stat.user_id}`;
    if (seenDietyWeekly.has(key)) {
      await prisma.dietyPrayStatsWeekly.delete({ where: { id: stat.id } });
    } else {
      seenDietyWeekly.add(key);
    }
  }

  // ShrinePrayStatsDaily
  const shrineStatsDaily = await prisma.shrinePrayStatsDaily.findMany({});
  const seenShrineDaily = new Set<string>();
  for (const stat of shrineStatsDaily) {
    const key = `${stat.shrine_id}_${stat.user_id}`;
    if (seenShrineDaily.has(key)) {
      await prisma.shrinePrayStatsDaily.delete({ where: { id: stat.id } });
    } else {
      seenShrineDaily.add(key);
    }
  }

  // DietyPrayStatsDaily
  const dietyStatsDaily = await prisma.dietyPrayStatsDaily.findMany({});
  const seenDietyDaily = new Set<string>();
  for (const stat of dietyStatsDaily) {
    const key = `${stat.diety_id}_${stat.user_id}`;
    if (seenDietyDaily.has(key)) {
      await prisma.dietyPrayStatsDaily.delete({ where: { id: stat.id } });
    } else {
      seenDietyDaily.add(key);
    }
  }

  console.log('重複レコードの削除が完了しました');
  await prisma.$disconnect();
}

cleanupDuplicates(); 