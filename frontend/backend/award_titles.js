const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function awardTitles() {
  try {
    console.log('称号付与処理を開始...');

    // 月間ランキング称号付与
    console.log('月間ランキング称号付与中...');

    // 神社ごとに1位～3位ユーザーに付与
    const shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
      include: {
        user: { select: { id: true, name: true } },
        shrine: { select: { id: true, name: true } }
      },
      orderBy: { count: 'desc' }
    });

    // 神社ごとにグループ化
    const shrineGroups = {};
    shrineStats.forEach(stat => {
      if (!shrineGroups[stat.shrine_id]) {
        shrineGroups[stat.shrine_id] = [];
      }
      shrineGroups[stat.shrine_id].push(stat);
    });

    const titleMaster = await prisma.titleMaster.findUnique({
      where: { code: 'monthly_rank_shrine' }
    });

    if (!titleMaster) {
      console.error('称号マスターが見つかりません: monthly_rank_shrine');
      return;
    }

    let shrineTitleCount = 0;
    for (const [shrineId, stats] of Object.entries(shrineGroups)) {
      if (stats.length === 0) continue;

      const shrine = stats[0].shrine;
      const maxCount = stats[0].count;

      // 同点の1位を取得
      const topStats = stats.filter(s => s.count === maxCount);

      for (let i = 0; i < topStats.length; i++) {
        const stat = topStats[i];
        const rank = i + 1;

        // 表示名を生成
        let displayName = titleMaster.name_template;
        const embedData = {
          shrine: shrine.name,
          shrine_id: shrine.id,
          period: '月間' + rank + '位',
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }

        // 既存の称号を削除して新しく作成
        await prisma.userTitle.deleteMany({
          where: {
            user_id: stat.user.id,
            title_id: titleMaster.id,
            embed_data: embedData
          }
        });

        await prisma.userTitle.create({
          data: {
            user_id: stat.user.id,
            title_id: titleMaster.id,
            awarded_at: new Date(),
            embed_data: embedData,
            grade: rank <= 3 ? 5 - rank : 1,
            display_name: displayName
          }
        });

        shrineTitleCount++;
        console.log(`神社称号付与: ${stat.user.name} - ${shrine.name} (${rank}位)`);
      }
    }

    // 神様ごとに1位ユーザーに付与
    console.log('神様月間ランキング称号付与中...');

    const dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
      include: {
        user: { select: { id: true, name: true } },
        diety: { select: { id: true, name: true } }
      },
      orderBy: { count: 'desc' }
    });

    // 神様ごとにグループ化
    const dietyGroups = {};
    dietyStats.forEach(stat => {
      if (!dietyGroups[stat.diety_id]) {
        dietyGroups[stat.diety_id] = [];
      }
      dietyGroups[stat.diety_id].push(stat);
    });

    const dietyTitleMaster = await prisma.titleMaster.findUnique({
      where: { code: 'monthly_rank_diety' }
    });

    if (!dietyTitleMaster) {
      console.error('称号マスターが見つかりません: monthly_rank_diety');
      return;
    }

    let dietyTitleCount = 0;
    for (const [dietyId, stats] of Object.entries(dietyGroups)) {
      if (stats.length === 0) continue;

      const diety = stats[0].diety;
      const maxCount = stats[0].count;

      // 同点の1位を取得
      const topStats = stats.filter(s => s.count === maxCount);

      for (const stat of topStats) {
        // 表示名を生成
        let displayName = dietyTitleMaster.name_template;
        const embedData = {
          diety: diety.name,
          diety_id: diety.id,
          period: '月間ランキング1位',
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }

        // 既存の称号を削除して新しく作成
        await prisma.userTitle.deleteMany({
          where: {
            user_id: stat.user.id,
            title_id: dietyTitleMaster.id,
            embed_data: embedData
          }
        });

        await prisma.userTitle.create({
          data: {
            user_id: stat.user.id,
            title_id: dietyTitleMaster.id,
            awarded_at: new Date(),
            embed_data: embedData,
            grade: 5,
            display_name: displayName
          }
        });

        dietyTitleCount++;
        console.log(`神様称号付与: ${stat.user.name} - ${diety.name} (1位)`);
      }
    }

    console.log(`称号付与完了: 神社${shrineTitleCount}件, 神様${dietyTitleCount}件`);

  } catch (error) {
    console.error('称号付与エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

awardTitles();
