const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTitles() {
  try {
    console.log('称号付与デバッグ開始...');
    
    // 神社統計の確認
    const shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
      include: { 
        user: { select: { id: true, name: true } },
        shrine: { select: { id: true, name: true } }
      },
      orderBy: { count: 'desc' },
      take: 10
    });
    
    console.log('神社統計サンプル:');
    shrineStats.forEach(stat => {
      console.log(`- ${stat.user.name}: ${stat.shrine.name} (${stat.count}回)`);
    });
    
    // 神様統計の確認
    const dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
      include: { 
        user: { select: { id: true, name: true } },
        diety: { select: { id: true, name: true } }
      },
      orderBy: { count: 'desc' },
      take: 10
    });
    
    console.log('\n神様統計サンプル:');
    dietyStats.forEach(stat => {
      console.log(`- ${stat.user.name}: ${stat.diety.name} (${stat.count}回)`);
    });
    
    // 称号マスターの確認
    const titleMasters = await prisma.titleMaster.findMany({
      where: {
        code: { in: ['monthly_rank_shrine', 'monthly_rank_diety'] }
      }
    });
    
    console.log('\n称号マスター:');
    titleMasters.forEach(tm => {
      console.log(`- ${tm.code}: ${tm.name_template}`);
    });
    
    // 現在の称号数を確認
    const currentTitles = await prisma.userTitle.count();
    console.log(`\n現在の称号数: ${currentTitles}`);
    
  } catch (error) {
    console.error('デバッグエラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTitles(); 