import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AreaData {
  code: string;
  name: string;
  parentCode: string | null;
}

async function seedAreas() {
  try {
    console.log('🌍 Areaデータのシードを開始します...');

    // area.txtファイルを読み込み
    const areaFilePath = path.join(__dirname, '../area.txt');
    const fileContent = fs.readFileSync(areaFilePath, 'utf-8');
    
    // ヘッダー行をスキップしてデータを解析
    const lines = fileContent.split('\n').slice(1);
    const areas: AreaData[] = [];

    for (const line of lines) {
      if (line.trim()) {
        const [code, name, parentCode] = line.split('\t');
        areas.push({
          code: code.trim(),
          name: name.trim(),
          parentCode: parentCode.trim() || null
        });
      }
    }

    console.log(`📊 ${areas.length}件の地域データを読み込みました`);

    // 既存のAreaデータを削除
    await prisma.area.deleteMany();
    console.log('🗑️ 既存のAreaデータを削除しました');

    // 再帰的に登録する関数
    const areaMap = new Map<string, AreaData[]>();
    for (const area of areas) {
      const parent = area.parentCode || 'ROOT';
      if (!areaMap.has(parent)) areaMap.set(parent, []);
      areaMap.get(parent)!.push(area);
    }

    async function insertAreas(parentCode: string | null) {
      const key = parentCode || 'ROOT';
      const children = areaMap.get(key) || [];
      for (const area of children) {
        await prisma.area.create({
          data: {
            code: area.code,
            name: area.name,
            parentCode: area.parentCode
          }
        });
        // 子孫も登録
        await insertAreas(area.code);
      }
    }

    // ルート（都道府県）から再帰的に登録
    await insertAreas(null);

    console.log('✅ Areaデータのシードが完了しました！');

    // 統計情報を表示
    const totalAreas = await prisma.area.count();
    const parentCount = await prisma.area.count({
      where: { parentCode: null }
    });
    const childCount = await prisma.area.count({
      where: { parentCode: { not: null } }
    });

    console.log(`📈 統計情報:`);
    console.log(`   - 総地域数: ${totalAreas}`);
    console.log(`   - 親地域数: ${parentCount}`);
    console.log(`   - 子地域数: ${childCount}`);

  } catch (error) {
    console.error('❌ Areaデータのシード中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  seedAreas()
    .then(() => {
      console.log('🎉 Areaシードが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Areaシードが失敗しました:', error);
      process.exit(1);
    });
}

export { seedAreas }; 