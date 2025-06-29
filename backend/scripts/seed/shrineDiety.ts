import { PrismaClient } from '@prisma/client';

export async function seedShrineDiety(prisma: PrismaClient, shrineIds: number[]) {
  const dietyIds = (await prisma.diety.findMany({ select: { id: true } })).map(d => d.id);
  const data = [
    { shrine_id: 1, diety_id: 1 },
    { shrine_id: 1, diety_id: 6 },
    { shrine_id: 1, diety_id: 11 },
    { shrine_id: 8, diety_id: 2 },
    { shrine_id: 8, diety_id: 8 },
    { shrine_id: 8, diety_id: 4 },
    { shrine_id: 8, diety_id: 17 },
    { shrine_id: 1831, diety_id: 7 },
    { shrine_id: 1831, diety_id: 9 },
  ];
  const filtered = data.filter((d) => shrineIds.includes(d.shrine_id) && dietyIds.includes(d.diety_id));
  if (filtered.length > 0) {
    await prisma.shrineDiety.createMany({
      data: filtered,
      skipDuplicates: true,
    });
  }
}
