const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function bulkAwardTitles() {
  try {
    console.log('一括称号付与処理を開始...');

    // 既存の称号をすべて削除
    console.log('既存の称号を削除中...');
    await prisma.userTitle.deleteMany();
    console.log('既存の称号を削除完了');

    // 月間ランキング称号付与
    console.log('月間ランキング称号付与中...');

    // 神社ごとに1位～3位ユーザーに付与
    const shrineTitleMaster = await prisma.titleMaster.findUnique({
      where: { code: 'monthly_rank_shrine' }
    });

    if (!shrineTitleMaster) {
      console.error('称号マスターが見つかりません: monthly_rank_shrine');
      return;
    }

    // 神社統計を一括取得
    const shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
      include: {
        user: { select: { id: true, name: true } },
        shrine: { select: { id: true, name: true } }
      },
      orderBy: { count: 'desc' }
    });

    // 神社ごとにグループ化して上位3位まで取得
    const shrineGroups = {};
    shrineStats.forEach(stat => {
      if (!shrineGroups[stat.shrine_id]) {
        shrineGroups[stat.shrine_id] = [];
      }
      shrineGroups[stat.shrine_id].push(stat);
    });

    const shrineTitles = [];
    for (const [shrineId, stats] of Object.entries(shrineGroups)) {
      if (stats.length === 0) continue;

      const shrine = stats[0].shrine;
      const topStats = stats.slice(0, 3); // 上位3位まで

      for (let i = 0; i < topStats.length; i++) {
        const stat = topStats[i];
        const rank = i + 1;

        // 表示名を生成
        let displayName = shrineTitleMaster.name_template;
        const embedData = {
          shrine: shrine.name,
          shrine_id: shrine.id,
          rank: rank + '位',
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }

        shrineTitles.push({
          user_id: stat.user.id,
          title_id: shrineTitleMaster.id,
          awarded_at: new Date(),
          embed_data: embedData,
          grade: rank <= 3 ? 5 - rank : 1,
          display_name: displayName
        });
      }
    }

    // 神様ごとに1位ユーザーに付与
    const dietyTitleMaster = await prisma.titleMaster.findUnique({
      where: { code: 'monthly_rank_diety' }
    });

    if (!dietyTitleMaster) {
      console.error('称号マスターが見つかりません: monthly_rank_diety');
      return;
    }

    // 神様統計を一括取得
    const dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
      include: {
        user: { select: { id: true, name: true } },
        diety: { select: { id: true, name: true } }
      },
      orderBy: { count: 'desc' }
    });

    // 神様ごとにグループ化して1位を取得
    const dietyGroups = {};
    dietyStats.forEach(stat => {
      if (!dietyGroups[stat.diety_id]) {
        dietyGroups[stat.diety_id] = [];
      }
      dietyGroups[stat.diety_id].push(stat);
    });

    const dietyTitles = [];
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
          rank: '1位',
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }

        dietyTitles.push({
          user_id: stat.user.id,
          title_id: dietyTitleMaster.id,
          awarded_at: new Date(),
          embed_data: embedData,
          grade: 5,
          display_name: displayName
        });
      }
    }

    // 一括挿入
    console.log(`神社称号: ${shrineTitles.length}件, 神様称号: ${dietyTitles.length}件を一括挿入中...`);

    if (shrineTitles.length > 0) {
      await prisma.userTitle.createMany({
        data: shrineTitles,
        skipDuplicates: true
      });
    }

    if (dietyTitles.length > 0) {
      await prisma.userTitle.createMany({
        data: dietyTitles,
        skipDuplicates: true
      });
    }

    // 最終確認
    const finalTitles = await prisma.userTitle.count();
    console.log(`称号付与完了: 合計${finalTitles}件`);

  } catch (error) {
    console.error('称号付与エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

bulkAwardTitles();
