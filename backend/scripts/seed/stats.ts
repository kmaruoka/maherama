import { PrismaClient } from '@prisma/client';

export async function seedStats(prisma: PrismaClient) {
  const shrine = await prisma.shrine.findFirst({ select: { id: true } });
  const diety = await prisma.diety.findFirst({ select: { id: true } });
  const users = await prisma.user.findMany({ select: { id: true }, take: 3 });

  if (!shrine || !diety || users.length === 0) return;

  const userIds = users.map(u => u.id);
  const baseShrine = [
    { rank: 1, shrine_id: shrine.id, user_id: userIds[0], count: 10 },
    { rank: 2, shrine_id: shrine.id, user_id: userIds[1] ?? userIds[0], count: 5 },
  ];
  const baseDiety = [
    { rank: 1, diety_id: diety.id, user_id: userIds[0], count: 8 },
    { rank: 2, diety_id: diety.id, user_id: userIds[1] ?? userIds[0], count: 4 },
  ];

  await prisma.shrinePrayStats.createMany({ data: baseShrine, skipDuplicates: true });
  await prisma.shrinePrayStatsMonthly.createMany({ data: baseShrine, skipDuplicates: true });
  await prisma.shrinePrayStatsWeekly.createMany({ data: baseShrine, skipDuplicates: true });
  await prisma.shrinePrayStatsDaily.createMany({ data: baseShrine, skipDuplicates: true });
  await prisma.shrinePrayStatsYearly.createMany({ data: baseShrine, skipDuplicates: true });
  await prisma.dietyPrayStats.createMany({ data: baseDiety, skipDuplicates: true });
  await prisma.dietyPrayStatsMonthly.createMany({ data: baseDiety, skipDuplicates: true });
  await prisma.dietyPrayStatsWeekly.createMany({ data: baseDiety, skipDuplicates: true });
  await prisma.dietyPrayStatsDaily.createMany({ data: baseDiety, skipDuplicates: true });
  await prisma.dietyPrayStatsYearly.createMany({ data: baseDiety, skipDuplicates: true });
}
