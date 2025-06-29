import { PrismaClient } from '@prisma/client';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      { id: 1, name: 'テストユーザー1' },
      { id: 2, name: 'テストユーザー2' },
      { id: 3, name: 'テストユーザー3' },
      { id: 4, name: 'テストユーザー4' },
      { id: 5, name: 'テストユーザー5' },
    ],
    skipDuplicates: true,
  });
}
