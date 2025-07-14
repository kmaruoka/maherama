import { PrismaClient } from '@prisma/client';
import { seedShrine, seedShrinesFromTxt } from './shrine';
import { seedDiety } from './diety';
import { seedShrineDiety } from './shrineDiety';
import { seedUser } from './user';
import { seedRealisticTransactions } from './realisticTransactions';
import { seedSubscription } from './subscription';
import { seedAbility } from './ability';
import { seedTitle } from './title';
import { seedLevel } from './level';
import { seedShrineImage } from './shrineImage';

const prisma = new PrismaClient();

async function main() {
  await seedLevel(prisma); // ←最初に呼ぶ
  const shrineIds = await seedShrine(prisma);
  await seedDiety(prisma);
  await seedShrineDiety(prisma, shrineIds);
  // shrines.txtの神社・祭神リレーションも追加
  await seedShrinesFromTxt(prisma, '../scripts/shrines.txt');
  await seedUser(prisma);
  await seedSubscription(prisma);
  await seedAbility(prisma);
  await seedTitle(prisma);
  await seedShrineImage(prisma);
  // 全マスターデータが揃った後にトランザクションデータを生成
  await seedRealisticTransactions(prisma);
  console.log("✅ Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
