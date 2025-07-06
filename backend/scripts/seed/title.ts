import { PrismaClient } from '@prisma/client';

export async function seedTitle(prisma: PrismaClient) {
  await prisma.titleMaster.createMany({
    data: [
      { id: 1, name: '新人参拝者', condition_type: 'level', condition_value: '1', exp_reward: 50 },
      { id: 2, name: '熟練参拝者', condition_type: 'level', condition_value: '5', exp_reward: 200 },
      { id: 3, name: '参拝王', condition_type: 'level', condition_value: '10', exp_reward: 500 },
    ],
    skipDuplicates: true,
  });
  await prisma.userTitle.createMany({
    data: [{ user_id: 1, title_id: 1 }],
    skipDuplicates: true,
  });
}
