import { PrismaClient } from '@prisma/client';

export async function seedFollow(prisma: PrismaClient) {
  await prisma.follow.createMany({
    data: [
      { follower_id: 1, following_id: 2 },
      { follower_id: 1, following_id: 3 },
      { follower_id: 2, following_id: 1 },
      { follower_id: 3, following_id: 1 },
      { follower_id: 3, following_id: 2 },
    ],
    skipDuplicates: true,
  });
}
