import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAreaToShrine() {
  try {
    console.log('⛩️ 神社のarea_id自動割当を開始します...');
    const areas = await prisma.area.findMany();
    const shrines = await prisma.shrine.findMany();

    let updated = 0;
    for (const shrine of shrines) {
      // 所在地に都道府県名や市区町村名が含まれているかでAreaを特定
      const matchedArea = areas.find(area =>
        shrine.location.includes(area.name)
      );
      if (matchedArea) {
        await prisma.shrine.update({
          where: { id: shrine.id },
          data: { area_id: matchedArea.id }
        });
        updated++;
      }
    }
    console.log(`✅ 割当完了: ${updated}件の神社にarea_idを設定しました`);
  } catch (error) {
    console.error('❌ 割当中にエラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  assignAreaToShrine()
    .then(() => {
      console.log('🎉 割当スクリプト正常終了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 割当スクリプト失敗:', error);
      process.exit(1);
    });
}

export { assignAreaToShrine }; 