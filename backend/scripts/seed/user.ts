import { PrismaClient } from '@prisma/client';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      { id: 1, name: 'まるにぃ', level: 1, exp: 0, ability_points: 0 },
      { id: 2, name: 'たかやん', level: 10, exp: 2520, ability_points: 1000 },
      { id: 3, name: 'ダイナマイト古川', level: 20, exp: 11020, ability_points: 2000 },
      { id: 4, name: 'まゆたそ', level: 30, exp: 25200, ability_points: 3000 },
      { id: 5, name: 'あおい', level: 40, exp: 48400, ability_points: 4000 },
      { id: 6, name: 'さくら', level: 50, exp: 83600, ability_points: 5000 },
      { id: 7, name: 'カプウヤ', level: 60, exp: 134200, ability_points: 6000 },
      { id: 8, name: 'らりらり', level: 70, exp: 200400, ability_points: 7000 },
      { id: 9, name: 'さつき', level: 80, exp: 284000, ability_points: 8000 },
      { id: 10, name: 'こだま', level: 90, exp: 386000, ability_points: 9000 },
    ],
    skipDuplicates: true,
  });
}
