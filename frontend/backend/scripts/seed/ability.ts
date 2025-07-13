import { PrismaClient } from '@prisma/client';

export async function seedAbility(prisma: PrismaClient) {
  // 既存のデータを削除（外部キー制約を考慮）
  await prisma.userAbility.deleteMany();
  await prisma.abilityLog.deleteMany();
  await prisma.abilityMaster.deleteMany();

  // 参拝距離延長ツリー（50段階、チェーン）
  const rangeAbilities: Array<{
    id: number;
    name: string;
    description: string;
    cost: number;
    effect_type: string;
    effect_value: number;
    prerequisite_ability_id: number | null;
  }> = [];
  for (let i = 1; i <= 50; i++) {
    rangeAbilities.push({
      id: i,
      name: `参拝距離+${i * 10}m`,
      description: `参拝可能距離が${i * 10}m延長されます。`,
      cost: i * 50,
      effect_type: 'range',
      effect_value: i * 10,
      prerequisite_ability_id: i === 1 ? null : i - 1,
    });
  }

  // その他の能力（1行1スキル、必要なものだけ）
  const otherAbilities = [
    { id: 51, name: '画像投稿', description: '神社の画像を投稿できるようになります。', cost: 200, effect_type: 'image_post', effect_value: 1, prerequisite_ability_id: null },
    { id: 52, name: '伝承投稿', description: '神社の伝承や歴史を投稿できるようになります。', cost: 300, effect_type: 'history_post', effect_value: 1, prerequisite_ability_id: 51 },
    { id: 53, name: '神社申請', description: '新しい神社を申請できるようになります。', cost: 500, effect_type: 'shrine_apply', effect_value: 1, prerequisite_ability_id: 52 },
    { id: 54, name: '承認権限', description: '神社申請を承認できる権限を獲得します。', cost: 50000, effect_type: 'approval', effect_value: 1, prerequisite_ability_id: 53 },
    { id: 55, name: '遥拝回数+1', description: '1日の遥拝回数が1回増加します。', cost: 5000, effect_type: 'worship', effect_value: 1, prerequisite_ability_id: null },
    { id: 56, name: 'スキン購入', description: '新しいスキンを購入できるようになります。', cost: 100, effect_type: 'skin', effect_value: 1, prerequisite_ability_id: null },
  ];

  await prisma.abilityMaster.createMany({
    data: [...rangeAbilities, ...otherAbilities],
    skipDuplicates: true,
  });
}
