import { PrismaClient } from '@prisma/client';

export async function seedSubscription(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ select: { id: true }, orderBy: { id: 'asc' }, take: 5 });
  
  if (users.length === 0) return;

  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscriptions = users.map((user, idx) => ({
    user_id: user.id,
    slots: idx, // 0,1,2,3,4
    expires_at: oneMonthLater,
    is_active: true,
    billing_cycle_start: now,
    billing_cycle_end: oneMonthLater
  }));

  await prisma.userSubscription.createMany({ 
    data: subscriptions, 
    skipDuplicates: true 
  });
} 