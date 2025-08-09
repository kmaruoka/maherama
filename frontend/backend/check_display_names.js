const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDisplayNames() {
  try {
    const userTitles = await prisma.userTitle.findMany({
      include: {
        title: true,
        user: { select: { id: true, name: true } }
      },
      take: 20
    });

    console.log('称号表示名サンプル:');
    userTitles.forEach(ut => {
      console.log(`- ${ut.user.name}: ${ut.display_name} (グレード: ${ut.grade})`);
    });

    const titleCount = await prisma.userTitle.count();
    console.log(`\n総称号数: ${titleCount}`);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDisplayNames();
