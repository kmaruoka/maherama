import { PrismaClient } from '@prisma/client';

export async function seedSubscription(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ select: { id: true }, take: 3 });
  
  if (users.length === 0) return;

  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscriptions = [
    { user_id: users[0].id, plan_type: 'premium', slots: 3, expires_at: oneMonthLater },
    { user_id: users[1].id, plan_type: 'basic', slots: 1, expires_at: oneMonthLater },
    // users[2]は無課金（slots=0）
  ];

  await prisma.userSubscription.createMany({ 
    data: subscriptions, 
    skipDuplicates: true 
  });
} 