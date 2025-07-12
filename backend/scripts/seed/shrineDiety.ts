import { PrismaClient } from '@prisma/client';

export async function seedShrineDiety(prisma: PrismaClient, shrineIds: number[]) {
  const dietyIds = (await prisma.diety.findMany({ select: { id: true } })).map(d => d.id);
  
  // 平均1:4の比率で組み合わせを生成
  const shrineDietyPairs: { shrine_id: number; diety_id: number }[] = [];
  
  // 各神社に対して、平均4つの神様をランダムに割り当て
  shrineIds.forEach(shrineId => {
    // 1〜7の範囲でランダムに神様の数を決定（平均4）
    const numDieties = Math.floor(Math.random() * 7) + 1;
    
    // 重複を避けてランダムに神様を選択
    const selectedDietyIds = [];
    const availableDietyIds = [...dietyIds];
    
    for (let i = 0; i < numDieties && availableDietyIds.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableDietyIds.length);
      const selectedDietyId = availableDietyIds.splice(randomIndex, 1)[0];
      selectedDietyIds.push(selectedDietyId);
    }
    
    // 組み合わせを追加
    selectedDietyIds.forEach(dietyId => {
      shrineDietyPairs.push({
        shrine_id: shrineId,
        diety_id: dietyId
      });
    });
  });

  console.log(`Generated ${shrineDietyPairs.length} shrine-diety pairs for ${shrineIds.length} shrines`);

  if (shrineDietyPairs.length > 0) {
    await prisma.shrineDiety.createMany({
      data: shrineDietyPairs,
      skipDuplicates: true,
    });
    
    console.log(`Inserted shrine-diety relationships`);
  }
}
