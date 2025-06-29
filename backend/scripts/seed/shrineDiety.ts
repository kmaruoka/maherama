import { PrismaClient } from '@prisma/client';

export async function seedShrineDiety(prisma: PrismaClient) {
  const data = [
    { shrine_id: 1, diety_id: 1 },
    { shrine_id: 1, diety_id: 6 },
    { shrine_id: 1, diety_id: 11 },
    { shrine_id: 2, diety_id: 2 },
    { shrine_id: 2, diety_id: 8 },
    { shrine_id: 3, diety_id: 4 },
    { shrine_id: 3, diety_id: 17 },
    { shrine_id: 1831, diety_id: 7 },
    { shrine_id: 1831, diety_id: 9 },
  ];
  await prisma.shrineDiety.createMany({
    data,
    skipDuplicates: true,
  });
}
