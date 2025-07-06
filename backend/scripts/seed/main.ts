import { PrismaClient } from '@prisma/client';
import { seedShrine } from './shrine';
import { seedDiety } from './diety';
import { seedShrineDiety } from './shrineDiety';
import { seedUser } from './user';
import { seedStats } from './stats';
import { seedLog } from './log';
import { seedFollow } from './follow';
import { seedSubscription } from './subscription';
import { seedAbility } from './ability';
import { seedTitle } from './title';
import { seedLevel } from './level';

const prisma = new PrismaClient();

async function main() {
  const shrineIds = await seedShrine(prisma);
  await seedDiety(prisma);
  await seedShrineDiety(prisma, shrineIds);
  await seedUser(prisma);
  await seedFollow(prisma);
  await seedLog(prisma);
  await seedStats(prisma);
  await seedSubscription(prisma);
  await seedAbility(prisma);
  await seedTitle(prisma);
  await seedLevel(prisma);
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
