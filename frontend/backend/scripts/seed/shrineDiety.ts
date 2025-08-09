import { PrismaClient } from '@prisma/client';

export async function seedShrineDiety(prisma: PrismaClient, shrineIds: number[]) {
  // 神様IDリストを取得
  const allDieties = await prisma.diety.findMany({ select: { id: true } });
  console.log(`Found ${allDieties.length} dieties for shrine-diety relationship generation`);

  if (allDieties.length === 0) {
    console.log('⚠️ No dieties found. Skipping shrine-diety relationship generation.');
    return;
  }

  // サムネイル画像がある神様IDリストを取得（オプション）
  const dietyImages = await prisma.dietyImage.findMany({
    where: { is_current_thumbnail: true },
    select: { diety_id: true }
  });
  const withThumbnailIds = new Set(dietyImages.map(d => d.diety_id));
  console.log(`Found ${dietyImages.length} dieties with thumbnail images`);

  // 神様IDリストを「サムネイルありは2回、なしは1回」ずつ配列に入れる
  const weightedDietyIds: number[] = [];
  allDieties.forEach(d => {
    if (withThumbnailIds.has(d.id)) {
      weightedDietyIds.push(d.id, d.id); // 2回
    } else {
      weightedDietyIds.push(d.id); // 1回
    }
  });

  console.log(`Weighted diety IDs: ${weightedDietyIds.length} total (${allDieties.length} unique dieties)`);

  // ランダム生成リレーション
  const shrineDietyPairs: { shrine_id: number; diety_id: number }[] = [];
  shrineIds.forEach(shrineId => {
    const numDieties = Math.floor(Math.random() * 7) + 1;
    const selectedDietyIds = [];
    const availableDietyIds = [...weightedDietyIds];
    for (let i = 0; i < numDieties && availableDietyIds.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableDietyIds.length);
      const selectedDietyId = availableDietyIds.splice(randomIndex, 1)[0];
      if (!selectedDietyIds.includes(selectedDietyId)) {
        selectedDietyIds.push(selectedDietyId);
      }
    }
    selectedDietyIds.forEach(dietyId => {
      shrineDietyPairs.push({
        shrine_id: shrineId,
        diety_id: dietyId
      });
    });
  });

  console.log(`Generated ${shrineDietyPairs.length} shrine-diety pairs for ${shrineIds.length} shrines`);

  if (shrineDietyPairs.length > 0) {
    const result = await prisma.shrineDiety.createMany({
      data: shrineDietyPairs,
      skipDuplicates: true,
    });
    console.log(`Inserted ${result.count} shrine-diety relationships (${shrineDietyPairs.length - result.count} duplicates skipped)`);
  } else {
    console.log('⚠️ No shrine-diety pairs generated. Check if dieties exist in database.');
  }
}
