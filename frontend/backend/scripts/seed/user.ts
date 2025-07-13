import { PrismaClient } from '@prisma/client';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      { id: 1, name: 'らりらり', level: 1, exp: 0, ability_points: 0 },
      { id: 2, name: 'カプウヤ', level: 1, exp: 0, ability_points: 0 },
      { id: 3, name: 'ダイナマイト古川', level: 1, exp: 0, ability_points: 0 },
      { id: 4, name: 'まゆたそ', level: 1, exp: 0, ability_points: 0 },
      { id: 5, name: 'あおい', level: 1, exp: 0, ability_points: 0 },
      { id: 6, name: 'さくら', level: 1, exp: 0, ability_points: 0 },
      { id: 7, name: 'たかやん', level: 1, exp: 0, ability_points: 0 },
      { id: 8, name: 'さつき', level: 1, exp: 0, ability_points: 0 },
      { id: 9, name: 'こだま', level: 1, exp: 0, ability_points: 0 },
      { id: 10, name: 'まるにぃ', level: 1, exp: 0, ability_points: 0 },
    ],
    skipDuplicates: true,
  });
}
