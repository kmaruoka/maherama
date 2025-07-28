const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTitles() {
  try {
    // 称号マスターの確認
    const titleMasters = await prisma.titleMaster.findMany();
    console.log('称号マスター数:', titleMasters.length);
    console.log('称号マスター一覧:');
    titleMasters.forEach(tm => {
      console.log(`- ${tm.code}: ${tm.name_template} (${tm.type})`);
    });

    // ユーザー称号の確認
    const userTitles = await prisma.userTitle.findMany({
      include: { 
        title: true, 
        user: { select: { id: true, name: true } } 
      }
    });
    console.log('\nユーザー称号数:', userTitles.length);
    console.log('ユーザー称号一覧:');
    userTitles.forEach(ut => {
      console.log(`- ${ut.user.name}: ${ut.title.name_template} (グレード: ${ut.grade}, 表示名: ${ut.display_name})`);
    });

    // ランキング統計の確認
    const shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
      include: { user: { select: { id: true, name: true } }, shrine: { select: { id: true, name: true } } }
    });
    console.log('\n神社月間統計数:', shrineStats.length);
    
    const dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
      include: { user: { select: { id: true, name: true } }, diety: { select: { id: true, name: true } } }
    });
    console.log('神様月間統計数:', dietyStats.length);

    // ユーザー数確認
    const users = await prisma.user.findMany({ select: { id: true, name: true } });
    console.log('\nユーザー数:', users.length);
    users.forEach(u => console.log(`- ${u.id}: ${u.name}`));

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTitles(); 