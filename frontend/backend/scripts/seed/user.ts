import { PrismaClient } from '@prisma/client';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      { name: 'らりらり', level: 1, exp: 0, ability_points: 0 },
      { name: 'カプウヤ', level: 1, exp: 0, ability_points: 0 },
      { name: 'ダイナマイト古川', level: 1, exp: 0, ability_points: 0 },
      { name: 'まゆたそ', level: 1, exp: 0, ability_points: 0 },
      { name: 'あおい', level: 1, exp: 0, ability_points: 0 },
      { name: 'さくら', level: 1, exp: 0, ability_points: 0 },
      { name: 'たかやん', level: 1, exp: 0, ability_points: 0 },
      { name: 'さつき', level: 1, exp: 0, ability_points: 0 },
      { name: 'こだま', level: 1, exp: 0, ability_points: 0 },
      { name: 'まるにぃ', level: 1, exp: 0, ability_points: 0 },
    ],
    skipDuplicates: true,
  });

  // 管理者ユーザーを作成（role='admin'）
  const adminUser = await prisma.user.create({
    data: {
      name: 'admin',
      level: 1,
      exp: 0,
      ability_points: 0,
      role: 'admin'
    }
  });

  console.log(`✅ 管理者ユーザーを作成しました: ID=${adminUser.id}, role=${adminUser.role}`);
}
