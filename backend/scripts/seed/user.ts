import { PrismaClient } from '@prisma/client';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      { id: 1, name: 'まるにぃ', level: 0, exp: 0, ability_points: 0 },
      { id: 2, name: 'たかやん', level: 0, exp: 0, ability_points: 0 },
      { id: 3, name: 'ダイナマイト古川', level: 0, exp: 0, ability_points: 0 },
      { id: 4, name: 'まゆたそ', level: 0, exp: 0, ability_points: 0 },
      { id: 5, name: 'あおい', level: 0, exp: 0, ability_points: 0 },
    ],
    skipDuplicates: true,
  });
}
