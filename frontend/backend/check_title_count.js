const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTitleCount() {
  try {
    const titleCount = await prisma.userTitle.count();
    console.log(`称号数: ${titleCount}`);

    const userTitles = await prisma.userTitle.findMany({
      include: {
        title: true,
        user: { select: { id: true, name: true } }
      },
      take: 10
    });

    console.log('称号サンプル:');
    userTitles.forEach(ut => {
      console.log(`- ${ut.user.name}: ${ut.title.name_template} (グレード: ${ut.grade})`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTitleCount();
