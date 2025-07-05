import { PrismaClient } from '@prisma/client';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      { id: 1, name: 'まるにぃ' },
      { id: 2, name: 'たかやん' },
      { id: 3, name: 'ダイナマイト古川' },
      { id: 4, name: 'まゆたそ' },
      { id: 5, name: 'あおい' },
    ],
    skipDuplicates: true,
  });
}
