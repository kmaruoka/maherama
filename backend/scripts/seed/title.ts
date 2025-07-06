import { PrismaClient } from '@prisma/client';

export async function seedTitle(prisma: PrismaClient) {
  await prisma.titleMaster.createMany({
    data: [
      // 地域制覇系称号
      { id: 1, name: '全神社制覇<大阪市西区>', condition_type: 'area_complete', condition_value: '大阪市西区', exp_reward: 500 },
      { id: 2, name: '全神社制覇<大阪府>', condition_type: 'area_complete', condition_value: '大阪府', exp_reward: 1000 },
      { id: 3, name: '全神社制覇<東京都>', condition_type: 'area_complete', condition_value: '東京都', exp_reward: 1000 },
      { id: 4, name: '全神社制覇<京都府>', condition_type: 'area_complete', condition_value: '京都府', exp_reward: 1000 },
      { id: 5, name: '全神社制覇<奈良県>', condition_type: 'area_complete', condition_value: '奈良県', exp_reward: 800 },
      
      // 連続参拝系称号
      { id: 6, name: '21日参り<伏見稲荷大社>', condition_type: 'consecutive_pray', condition_value: '伏見稲荷大社', exp_reward: 200 },
      { id: 7, name: '21日参り<明治神宮>', condition_type: 'consecutive_pray', condition_value: '明治神宮', exp_reward: 200 },
      { id: 8, name: '21日参り<伊勢神宮>', condition_type: 'consecutive_pray', condition_value: '伊勢神宮', exp_reward: 300 },
      
      // 月間ランキング系称号（動的に生成されるため、テンプレート的なもの）
      { id: 9, name: '月間参拝数1位<神社名><年月>', condition_type: 'monthly_rank_shrine', condition_value: null, exp_reward: 200 },
      { id: 10, name: '月間参拝数1位<神様名><年月>', condition_type: 'monthly_rank_diety', condition_value: null, exp_reward: 200 },
      
      // 年間ランキング系称号（動的に生成されるため、テンプレート的なもの）
      { id: 11, name: '年間参拝数1位<神社名><年>', condition_type: 'yearly_rank_shrine', condition_value: null, exp_reward: 1000 },
      { id: 12, name: '年間参拝数1位<神様名><年>', condition_type: 'yearly_rank_diety', condition_value: null, exp_reward: 1000 },
      
      // その他の称号
      { id: 13, name: '初参拝', condition_type: 'first_pray', condition_value: null, exp_reward: 50 },
      { id: 14, name: '百社参り', condition_type: 'shrine_count', condition_value: '100', exp_reward: 500 },
      { id: 15, name: '千社参り', condition_type: 'shrine_count', condition_value: '1000', exp_reward: 2000 },
      { id: 16, name: '万社参り', condition_type: 'shrine_count', condition_value: '10000', exp_reward: 10000 },
      { id: 17, name: '神社申請者', condition_type: 'shrine_application', condition_value: null, exp_reward: 100 },
      { id: 18, name: '神社承認者', condition_type: 'shrine_approval', condition_value: null, exp_reward: 500 },
    ],
    skipDuplicates: true,
  });
  await prisma.userTitle.createMany({
    data: [{ user_id: 1, title_id: 1 }],
    skipDuplicates: true,
  });
}
