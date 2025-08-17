import { PrismaClient } from '@prisma/client';
import { seedAbility } from './ability';
import { seedDiety } from './diety';
import { seedDietyImage } from './dietyImage';
import { seedLevel } from './level';
import { seedMissions } from './mission';
import { seedNotifications } from './notification';
import { seedRealisticTransactions } from './realisticTransactions';
import { seedShrine, seedShrinesFromTxt } from './shrine';
import { seedShrineDiety } from './shrineDiety';
import { seedShrineImage } from './shrineImage';
import { seedSubscription } from './subscription';
import { seedTitle } from './title';
import { seedUser } from './user';

const prisma = new PrismaClient();

async function main() {
  await seedLevel(prisma); // ←最初に呼ぶ
  const shrineIds = await seedShrine(prisma);
  await seedDiety(prisma);

  // ShrineDiety生成前の件数を確認
  const beforeShrineDiety = await prisma.shrineDiety.count();
  console.log(`📊 ShrineDiety生成前: ${beforeShrineDiety}件`);

  await seedShrineDiety(prisma, shrineIds);

  // seedShrineDiety後の件数を確認
  const afterShrineDiety = await prisma.shrineDiety.count();
  console.log(`📊 seedShrineDiety後: ${afterShrineDiety}件 (+${afterShrineDiety - beforeShrineDiety}件)`);

  // shrines.txtの神社・祭神リレーションも追加
  await seedShrinesFromTxt(prisma, '../scripts/shrines.txt');

  // seedShrinesFromTxt後の件数を確認
  const afterShrinesFromTxt = await prisma.shrineDiety.count();
  console.log(`📊 seedShrinesFromTxt後: ${afterShrinesFromTxt}件 (+${afterShrinesFromTxt - afterShrineDiety}件)`);

  await seedUser(prisma);
  await seedSubscription(prisma);
  await seedAbility(prisma);
  await seedTitle(prisma);
  await seedShrineImage(prisma);
  await seedDietyImage(prisma);
  await seedMissions();
  await seedNotifications();
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
