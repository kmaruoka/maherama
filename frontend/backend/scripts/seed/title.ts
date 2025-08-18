import { PrismaClient } from '@prisma/client';

export async function seedTitle(prisma: PrismaClient) {
  await prisma.titleMaster.createMany({
    data: [
      // 地域制覇系称号テンプレート
      {
        code: 'area_complete',
        name_template: '全神社制覇<{area}>',
        description: '指定エリアの全神社を制覇した証',
        type: 'area_complete',
        exp_reward: 1000
      },
      // 連続参拝系称号テンプレート
      {
        code: 'consecutive_pray',
        name_template: '21日参り<{shrine}>',
        description: '指定神社で21日連続参拝した証',
        type: 'consecutive_pray',
        exp_reward: 200
      },
      // 週間ランキング系称号テンプレート（1位～3位）
      {
        code: 'weekly_rank_shrine_1st',
        name_template: '週間参拝数<{rank}><{shrine}><{period}>',
        description: '週間で最も多く参拝した神社（1位）',
        type: 'weekly_rank_shrine',
        exp_reward: 150
      },
      {
        code: 'weekly_rank_shrine_2nd',
        name_template: '週間参拝数<{rank}><{shrine}><{period}>',
        description: '週間で最も多く参拝した神社（2位）',
        type: 'weekly_rank_shrine',
        exp_reward: 100
      },
      {
        code: 'weekly_rank_shrine_3rd',
        name_template: '週間参拝数<{rank}><{shrine}><{period}>',
        description: '週間で最も多く参拝した神社（3位）',
        type: 'weekly_rank_shrine',
        exp_reward: 50
      },
      {
        code: 'weekly_rank_diety_1st',
        name_template: '週間参拝数<{rank}><{diety}><{period}>',
        description: '週間で最も多く参拝した神様（1位）',
        type: 'weekly_rank_diety',
        exp_reward: 150
      },
      {
        code: 'weekly_rank_diety_2nd',
        name_template: '週間参拝数<{rank}><{diety}><{period}>',
        description: '週間で最も多く参拝した神様（2位）',
        type: 'weekly_rank_diety',
        exp_reward: 100
      },
      {
        code: 'weekly_rank_diety_3rd',
        name_template: '週間参拝数<{rank}><{diety}><{period}>',
        description: '週間で最も多く参拝した神様（3位）',
        type: 'weekly_rank_diety',
        exp_reward: 50
      },
      // 月間ランキング系称号テンプレート（1位～3位）
      {
        code: 'monthly_rank_shrine_1st',
        name_template: '<{period}>月間参拝数<{rank}><{shrine}>',
        description: '月間で最も多く参拝した神社（1位）',
        type: 'monthly_rank_shrine',
        exp_reward: 300
      },
      {
        code: 'monthly_rank_shrine_2nd',
        name_template: '<{period}>月間参拝数<{rank}><{shrine}>',
        description: '月間で最も多く参拝した神社（2位）',
        type: 'monthly_rank_shrine',
        exp_reward: 200
      },
      {
        code: 'monthly_rank_shrine_3rd',
        name_template: '<{period}>月間参拝数<{rank}><{shrine}>',
        description: '月間で最も多く参拝した神社（3位）',
        type: 'monthly_rank_shrine',
        exp_reward: 100
      },
      {
        code: 'monthly_rank_diety_1st',
        name_template: '<{period}>月間参拝数<{rank}><{diety}>',
        description: '月間で最も多く参拝した神様（1位）',
        type: 'monthly_rank_diety',
        exp_reward: 300
      },
      {
        code: 'monthly_rank_diety_2nd',
        name_template: '<{period}>月間参拝数<{rank}><{diety}>',
        description: '月間で最も多く参拝した神様（2位）',
        type: 'monthly_rank_diety',
        exp_reward: 200
      },
      {
        code: 'monthly_rank_diety_3rd',
        name_template: '<{period}>月間参拝数<{rank}><{diety}>',
        description: '月間で最も多く参拝した神様（3位）',
        type: 'monthly_rank_diety',
        exp_reward: 100
      },
      // 年間ランキング系称号テンプレート（1位～3位）
      {
        code: 'yearly_rank_shrine_1st',
        name_template: '<{period}>年間参拝数<{rank}><{shrine}>',
        description: '年間で最も多く参拝した神社（1位）',
        type: 'yearly_rank_shrine',
        exp_reward: 1500
      },
      {
        code: 'yearly_rank_shrine_2nd',
        name_template: '<{period}>年間参拝数<{rank}><{shrine}>',
        description: '年間で最も多く参拝した神社（2位）',
        type: 'yearly_rank_shrine',
        exp_reward: 1000
      },
      {
        code: 'yearly_rank_shrine_3rd',
        name_template: '<{period}>年間参拝数<{rank}><{shrine}>',
        description: '年間で最も多く参拝した神社（3位）',
        type: 'yearly_rank_shrine',
        exp_reward: 500
      },
      {
        code: 'yearly_rank_diety_1st',
        name_template: '<{period}>年間参拝数<{rank}><{diety}>',
        description: '年間で最も多く参拝した神様（1位）',
        type: 'yearly_rank_diety',
        exp_reward: 1500
      },
      {
        code: 'yearly_rank_diety_2nd',
        name_template: '<{period}>年間参拝数<{rank}><{diety}>',
        description: '年間で最も多く参拝した神様（2位）',
        type: 'yearly_rank_diety',
        exp_reward: 1000
      },
      {
        code: 'yearly_rank_diety_3rd',
        name_template: '<{period}>年間参拝数<{rank}><{diety}>',
        description: '年間で最も多く参拝した神様（3位）',
        type: 'yearly_rank_diety',
        exp_reward: 500
      },
      // その他の称号テンプレート
      {
        code: 'first_pray',
        name_template: '初参拝',
        description: '初めて参拝した証',
        type: 'first_pray',
        exp_reward: 50
      },
      {
        code: 'shrine_count_100',
        name_template: '百社参り',
        description: '100社参拝達成',
        type: 'shrine_count',
        exp_reward: 500
      },
      {
        code: 'shrine_count_1000',
        name_template: '千社参り',
        description: '1000社参拝達成',
        type: 'shrine_count',
        exp_reward: 2000
      },
      {
        code: 'shrine_count_10000',
        name_template: '万社参り',
        description: '10000社参拝達成',
        type: 'shrine_count',
        exp_reward: 10000
      },
      {
        code: 'shrine_application',
        name_template: '神社申請者',
        description: '神社申請を行った証',
        type: 'shrine_application',
        exp_reward: 100
      },
      {
        code: 'shrine_approval',
        name_template: '神社承認者',
        description: '神社承認を行った証',
        type: 'shrine_approval',
        exp_reward: 500
      }
    ],
    skipDuplicates: true,
  });
  // テスト用の称号データを作成
  const titleMaster = await prisma.titleMaster.findFirst({
    where: { code: 'first_pray' }
  });

  if (titleMaster) {
    await prisma.userTitle.createMany({
      data: [{
        user_id: 1,
        title_id: titleMaster.id,
        grade: 1,
        display_name: '初参拝'
      }],
      skipDuplicates: true,
    });
  }
}
