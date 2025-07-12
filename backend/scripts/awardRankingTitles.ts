import { PrismaClient } from '@prisma/client';

// 週番号を取得する関数
function getWeekNumber(date: Date): number {
  // ISO 8601週番号（1年の最初の木曜日を含む週が第1週）
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  // 木曜日に合わせる
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return (
    1 + Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

// ランキング1位の人に称号を付与する汎用関数
export async function awardRankingTitles(
  prisma: PrismaClient, 
  period: 'yearly' | 'monthly' | 'weekly', 
  currentDate: Date
) {
  console.log(`🏆 ${period}ランキング1位の称号付与処理を開始...`);
  
  const periodText = {
    yearly: '年間',
    monthly: '月間', 
    weekly: '週間'
  }[period];
  
  const dateFormat = {
    yearly: (date: Date) => `${date.getFullYear()}`,
    monthly: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    weekly: (date: Date) => `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`
  }[period];
  
  const periodLabel = dateFormat(currentDate);
  
  try {
    // 神社ランキング1位を取得
    let shrineStats;
    switch (period) {
      case 'yearly':
        shrineStats = await prisma.shrinePrayStatsYearly.findMany({
          orderBy: { count: 'desc' },
          include: { 
            shrine: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          take: 1,
        });
        break;
      case 'monthly':
        shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
          orderBy: { count: 'desc' },
          include: { 
            shrine: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          take: 1,
        });
        break;
      case 'weekly':
        shrineStats = await prisma.shrinePrayStatsWeekly.findMany({
          orderBy: { count: 'desc' },
          include: { 
            shrine: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          take: 1,
        });
        break;
    }
    
    // 神様ランキング1位を取得
    let dietyStats;
    switch (period) {
      case 'yearly':
        dietyStats = await prisma.dietyPrayStatsYearly.findMany({
          orderBy: { count: 'desc' },
          include: { 
            diety: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          take: 1,
        });
        break;
      case 'monthly':
        dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
          orderBy: { count: 'desc' },
          include: { 
            diety: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          take: 1,
        });
        break;
      case 'weekly':
        dietyStats = await prisma.dietyPrayStatsWeekly.findMany({
          orderBy: { count: 'desc' },
          include: { 
            diety: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          take: 1,
        });
        break;
    }
    
    // 神社ランキング1位に称号を付与
    if (shrineStats.length > 0 && shrineStats[0].count > 0) {
      const topShrine = shrineStats[0];
      const titleName = `${periodText}参拝数1位<${topShrine.shrine.name}><${periodLabel}>`;
      
      // 称号マスターを取得（テンプレート）
      const titleMaster = await prisma.titleMaster.findFirst({
        where: {
          code: `${period}_rank_shrine`
        }
      });

      if (!titleMaster) {
        console.log(`❌ ${period}_rank_shrine の称号テンプレートが見つかりません`);
        return;
      }
      
      // ユーザーに称号を付与
      await prisma.userTitle.upsert({
        where: {
          user_id_title_id: {
            user_id: topShrine.user.id,
            title_id: titleMaster.id
          }
        },
        update: {},
        create: {
          user_id: topShrine.user.id,
          title_id: titleMaster.id
        }
      });
      
      // 経験値を付与
      await prisma.user.update({
        where: { id: topShrine.user.id },
        data: { exp: { increment: titleMaster.exp_reward } }
      });
      
      console.log(`🏆 神社ランキング1位: ${topShrine.user.name} が「${titleName}」を獲得 (${titleMaster.exp_reward}EXP)`);
    }
    
    // 神様ランキング1位に称号を付与
    if (dietyStats.length > 0 && dietyStats[0].count > 0) {
      const topDiety = dietyStats[0];
      const titleName = `${periodText}参拝数1位<${topDiety.diety.name}><${periodLabel}>`;
      
      // 称号マスターを取得（テンプレート）
      const titleMaster = await prisma.titleMaster.findFirst({
        where: {
          code: `${period}_rank_diety`
        }
      });

      if (!titleMaster) {
        console.log(`❌ ${period}_rank_diety の称号テンプレートが見つかりません`);
        return;
      }
      
      // ユーザーに称号を付与
      await prisma.userTitle.upsert({
        where: {
          user_id_title_id: {
            user_id: topDiety.user.id,
            title_id: titleMaster.id
          }
        },
        update: {},
        create: {
          user_id: topDiety.user.id,
          title_id: titleMaster.id
        }
      });
      
      // 経験値を付与
      await prisma.user.update({
        where: { id: topDiety.user.id },
        data: { exp: { increment: titleMaster.exp_reward } }
      });
      
      console.log(`🏆 神様ランキング1位: ${topDiety.user.name} が「${titleName}」を獲得 (${titleMaster.exp_reward}EXP)`);
    }
    
  } catch (error) {
    console.error(`❌ ${period}ランキング称号付与エラー:`, error);
  }
}

// 本番用の定期実行関数
export async function awardAllRankingTitles(prisma: PrismaClient) {
  const now = new Date();
  
  // 年間ランキング（年末に実行）
  if (now.getMonth() === 0 && now.getDate() === 1) {
    await awardRankingTitles(prisma, 'yearly', new Date(now.getFullYear() - 1, 11, 31));
  }
  
  // 月間ランキング（月初に実行）
  if (now.getDate() === 1) {
    await awardRankingTitles(prisma, 'monthly', new Date(now.getFullYear(), now.getMonth() - 1, 0));
  }
  
  // 週間ランキング（月曜日に実行）
  if (now.getDay() === 1) {
    await awardRankingTitles(prisma, 'weekly', new Date(now.getTime() - 24 * 60 * 60 * 1000));
  }
} 