import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export async function seedDiety(prisma: PrismaClient) {
  // dieties.txtファイルを読み込み
  const txtPath = path.join(__dirname, '..', 'dieties.txt');
  const fileContent = fs.readFileSync(txtPath, 'utf-8');
  
  // 行ごとに分割し、ヘッダー行を除外
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const dataLines = lines.slice(1); // ヘッダー行（id	name	reading	image	description）を除外
  
  // タブ区切りで分割してデータを変換
  const dieties = dataLines.map((line) => {
    const [id, name, reading, image, description] = line.split('\t');
    
    // nameが空の場合はスキップ
    if (!name || !name.trim()) {
      console.warn(`Skipping line with empty name: ${line}`);
      return null;
    }
    
    // IDの欠番は正常（13, 77, 327, 356, 368, 376など）
    // データベースのauto_incrementで適切に処理される
    return {
      id: Number(id?.trim() || 0),
      name: name.trim(),
      kana: reading?.trim() || '',
      image: image?.trim() || '',
      description: description?.trim() || null
    };
  }).filter(diety => diety !== null && diety.id > 0); // nullと無効なIDをフィルタリング

  console.log(`Found ${dieties.length} dieties from TXT data`);

  // データベースに一括挿入（skipDuplicatesで重複をスキップ）
  const result = await prisma.diety.createMany({
    data: dieties.map(({ image, ...diety }) => diety), // imageは除外
    skipDuplicates: true,
  });
  console.log(`Inserted ${result.count} dieties (${dieties.length - result.count} duplicates skipped)`);

  // 画像データがある場合は新しいImageテーブルとDietyテーブルに設定
  if (dieties.length > 0) {
    const dietiesWithImages = dieties.filter(d => d.image);
    for (const diety of dietiesWithImages) {
      try {
        // まずImageテーブルに登録
        const image = await prisma.image.create({
          data: {
            url: `/images/${diety.image}`,
            url64: `/images/${diety.image}`,
            url128: `/images/${diety.image}`,
            url256: `/images/${diety.image}`,
            url512: `/images/${diety.image}`
          }
        });

        // 次にDietyテーブルを更新
        await prisma.diety.update({
          where: { id: diety.id },
          data: {
            image_id: image.id,
            image_url: `/images/${diety.image}`,
            image_url64: `/images/${diety.image}`,
            image_url128: `/images/${diety.image}`,
            image_url256: `/images/${diety.image}`,
            image_url512: `/images/${diety.image}`,
            image_by: 'admin'
          }
        });
      } catch (error) {
        // 神格が存在しない場合はスキップ
        console.warn(`Diety with id ${diety.id} not found, skipping image update`);
      }
    }
    console.log(`Updated ${dietiesWithImages.length} diety images`);
  }
}
