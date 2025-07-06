import { PrismaClient } from '@prisma/client';

export async function seedAbility(prisma: PrismaClient) {
  await prisma.abilityMaster.createMany({
    data: [
      { id: 1, name: '参拝距離+10m', cost: 100, effect_type: 'range', effect_value: 10 },
      { id: 2, name: '遥拝回数+1', cost: 5000, effect_type: 'worship', effect_value: 1 },
      // { id: 3, name: 'スキン購入', cost: 100, effect_type: 'skin', effect_value: 1 },
    ],
    skipDuplicates: true,
  });
}
