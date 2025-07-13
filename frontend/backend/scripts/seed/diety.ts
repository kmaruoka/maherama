import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export async function seedDiety(prisma: PrismaClient) {
  // 管理者ユーザー（user_id:0
  await prisma.user.upsert({
    where: { id: 0 },
    update: {},
    create: { id: 0, name: 'admin', level: 1, exp: 0, ability_points: 0 }
  });

  // dieties.txtファイルを読み込み
  const txtPath = path.join(__dirname, '..', 'dieties.txt');
  const fileContent = fs.readFileSync(txtPath, 'utf-8');
  
  // 行ごとに分割し、ヘッダー行を除外
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const dataLines = lines.slice(1); // ヘッダー行（name	reading）を除外
  
  // タブ区切りで分割してデータを変換
  const dieties = dataLines.map((line) => {
    const [id, name, reading, image] = line.split('\t');
    return {
      id: Number(id.trim()),
      name: name.trim(),
      kana: reading.trim(),
      image: image ? image.trim() : ''
    };
  });

  console.log(`Found ${dieties.length} dieties from TXT data`);

  // データベースに個別挿入（外部キー制約違反を回避）
  let insertedCount = 0;
  for (const diety of dieties) {
    try {
      await prisma.diety.upsert({
        where: { id: diety.id },
        update: { name: diety.name, kana: diety.kana },
        create: { id: diety.id, name: diety.name, kana: diety.kana }
      });
      insertedCount++;
    } catch (error) {
      console.log(`Skipped diety ${diety.id} (${diety.name}): already exists`);
    }
  }
  console.log(`Inserted/Updated ${insertedCount} dieties`);

  // DietyImageも登録（imageが空でなければ）
  const dietyImages = dieties.filter(d => d.image).map(d => ({
    diety_id: d.id,
    user_id: 0, // システム管理者
    image_url: `/images/${d.image}`,
    thumbnail_url: `/images/${d.image}`,
    uploaded_at: new Date(),
    voting_month: '',
    is_winner: false,
    is_current_thumbnail: true
  }));
  
  if (dietyImages.length > 0) {
    try {
      await prisma.dietyImage.createMany({ 
        data: dietyImages, 
        skipDuplicates: true 
      });
      console.log(`Inserted ${dietyImages.length} diety images`);
    } catch (error) {
      console.warn(`Some diety images already exist, skipped duplicates`);
    }
  }
}
