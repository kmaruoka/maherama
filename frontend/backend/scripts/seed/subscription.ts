import { PrismaClient } from '@prisma/client';

export async function seedSubscription(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ select: { id: true }, orderBy: { id: 'asc' }, take: 5 });
  
  if (users.length === 0) return;

  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const types = ['range_multiplier', 'worship_boost', 'reset_abilities'];

  const subscriptions = users.map((user, idx) => ({
    user_id: user.id,
    subscription_type: types[idx % types.length],
    expires_at: oneMonthLater,
    is_active: true,
    billing_cycle_start: now,
    billing_cycle_end: oneMonthLater
  }));

  await prisma.userSubscription.createMany({ 
    data: subscriptions, 
    skipDuplicates: true 
  });

  // 奇数IDユーザーだけrange_multiplierサブスクリプションを付与
  const MAX_USER_ID = 10; // Assuming a maximum user ID for demonstration
  for (let userId = 1; userId <= MAX_USER_ID; userId++) {
    if (userId % 2 === 1) {
      await prisma.userSubscription.create({
        data: {
          user_id: userId,
          subscription_type: 'range_multiplier',
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });
    }
  }
} 