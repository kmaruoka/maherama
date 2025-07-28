const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function manualAwardTitles() {
  try {
    console.log('手動称号付与処理を開始...');
    
    // 月間ランキング称号付与
    console.log('月間ランキング称号付与中...');
    
    // 神社ごとに1位～3位ユーザーに付与
    const allShrines = await prisma.shrine.findMany({ select: { id: true, name: true } });
    console.log(`神社数: ${allShrines.length}`);
    
    const titleMaster = await prisma.titleMaster.findUnique({ 
      where: { code: 'monthly_rank_shrine' } 
    });
    
    if (!titleMaster) {
      console.error('称号マスターが見つかりません: monthly_rank_shrine');
      return;
    }
    
    let shrineTitleCount = 0;
    for (const shrine of allShrines) {
      // その神社の上位3件を取得
      const topStats = await prisma.shrinePrayStatsMonthly.findMany({
        where: { shrine_id: shrine.id },
        orderBy: { count: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true } } }
      });
      
      if (topStats.length === 0) continue;
      
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
        
        // 既存の称号を削除（embed_dataは除外）
        await prisma.userTitle.deleteMany({ 
          where: { 
            user_id: stat.user.id, 
            title_id: titleMaster.id
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
    
    const allDieties = await prisma.diety.findMany({ select: { id: true, name: true } });
    console.log(`神様数: ${allDieties.length}`);
    
    const dietyTitleMaster = await prisma.titleMaster.findUnique({ 
      where: { code: 'monthly_rank_diety' } 
    });
    
    if (!dietyTitleMaster) {
      console.error('称号マスターが見つかりません: monthly_rank_diety');
      return;
    }
    
    let dietyTitleCount = 0;
    for (const diety of allDieties) {
      const maxStat = await prisma.dietyPrayStatsMonthly.findFirst({
        where: { diety_id: diety.id },
        orderBy: { count: 'desc' }
      });
      if (!maxStat || maxStat.count === 0) continue;
      
      const topStats = await prisma.dietyPrayStatsMonthly.findMany({
        where: { diety_id: diety.id, count: maxStat.count },
        include: { user: { select: { id: true, name: true } } }
      });
      
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
        
        // 既存の称号を削除（embed_dataは除外）
        await prisma.userTitle.deleteMany({ 
          where: { 
            user_id: stat.user.id, 
            title_id: dietyTitleMaster.id
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
    
    // 最終確認
    const finalTitles = await prisma.userTitle.count();
    console.log(`最終称号数: ${finalTitles}`);
    
  } catch (error) {
    console.error('称号付与エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualAwardTitles(); 