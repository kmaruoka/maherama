import { PrismaClient } from "@prisma/client";

export async function seedZukan(prisma: PrismaClient) {
  const user = await prisma.user.findFirst({ select: { id: true } });
  const shrine = await prisma.shrine.findFirst({ select: { id: true } });
  const diety = await prisma.diety.findFirst({ select: { id: true } });

  if (!user || !shrine || !diety) return;

  await prisma.shrineBook.createMany({
    data: [{ user_id: user.id, shrine_id: shrine.id }],
    skipDuplicates: true,
  });

  await prisma.dietyBook.createMany({
    data: [{ user_id: user.id, diety_id: diety.id }],
    skipDuplicates: true,
  });
}
