import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export async function seedDiety(prisma: PrismaClient) {
  // dieties.txtファイルを読み込み
  const txtPath = path.join(__dirname, '..', 'dieties.txt');
  const fileContent = fs.readFileSync(txtPath, 'utf-8');
  
  // 行ごとに分割し、ヘッダー行を除外
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const dataLines = lines.slice(1); // ヘッダー行（name	reading）を除外
  
  // タブ区切りで分割してデータを変換
  const dieties = dataLines.map((line, index) => {
    const [name, reading] = line.split('\t');
    return {
      id: index + 1, // 1から始まるID
      name: name.trim(),
      kana: reading.trim(),
    };
  });

  console.log(`Found ${dieties.length} dieties from TXT data`);

  // データベースに挿入
  const result = await prisma.diety.createMany({
    data: dieties,
    skipDuplicates: true,
  });

  console.log(`Inserted ${result.count} dieties`);
}
