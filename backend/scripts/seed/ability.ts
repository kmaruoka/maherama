import { PrismaClient } from '@prisma/client';

export async function seedAbility(prisma: PrismaClient) {
  // 既存のデータを削除（外部キー制約を考慮）
  await prisma.userAbility.deleteMany();
  await prisma.abilityLog.deleteMany();
  await prisma.abilityMaster.deleteMany();

  // 新しい能力データを作成
  await prisma.abilityMaster.createMany({
    data: [
      // 参拝距離延長ツリー（直列、複数回獲得可能）
      { 
        id: 1, 
        name: '参拝距離+10m', 
        description: '参拝可能距離が10m延長されます。',
        base_cost: 100, 
        cost_increase: 100,
        effect_type: 'range', 
        effect_value: 10,
        max_level: 10 // 最大10回まで獲得可能
      },
      { 
        id: 2, 
        name: '参拝距離+20m', 
        description: '参拝可能距離が20m延長されます。',
        base_cost: 200, 
        cost_increase: 100,
        effect_type: 'range', 
        effect_value: 20,
        max_level: 10,
        prerequisite_ability_id: 1
      },
      { 
        id: 3, 
        name: '参拝距離+30m', 
        description: '参拝可能距離が30m延長されます。',
        base_cost: 300, 
        cost_increase: 100,
        effect_type: 'range', 
        effect_value: 30,
        max_level: 10,
        prerequisite_ability_id: 2
      },

      // 投稿系ツリー（直列）
      { 
        id: 4, 
        name: '画像投稿', 
        description: '神社の画像を投稿できるようになります。',
        base_cost: 200, 
        cost_increase: 0,
        effect_type: 'image_post', 
        effect_value: 1,
        max_level: 1
      },
      { 
        id: 5, 
        name: '伝承投稿', 
        description: '神社の伝承や歴史を投稿できるようになります。',
        base_cost: 300, 
        cost_increase: 0,
        effect_type: 'history_post', 
        effect_value: 1,
        max_level: 1,
        prerequisite_ability_id: 4
      },
      { 
        id: 6, 
        name: '神社申請', 
        description: '新しい神社を申請できるようになります。',
        base_cost: 500, 
        cost_increase: 0,
        effect_type: 'shrine_apply', 
        effect_value: 1,
        max_level: 1,
        prerequisite_ability_id: 5
      },
      { 
        id: 7, 
        name: '承認権限', 
        description: '神社申請を承認できる権限を獲得します。',
        base_cost: 50000, 
        cost_increase: 0,
        effect_type: 'approval', 
        effect_value: 1,
        max_level: 1,
        prerequisite_ability_id: 6
      },

      // その他の能力（1回限り）
      { 
        id: 8, 
        name: '遥拝回数+1', 
        description: '1日の遥拝回数が1回増加します。',
        base_cost: 5000, 
        cost_increase: 0,
        effect_type: 'worship', 
        effect_value: 1,
        max_level: 1
      },
      { 
        id: 9, 
        name: 'スキン購入', 
        description: '新しいスキンを購入できるようになります。',
        base_cost: 100, 
        cost_increase: 0,
        effect_type: 'skin', 
        effect_value: 1,
        max_level: 1
      },
    ],
    skipDuplicates: true,
  });
}
