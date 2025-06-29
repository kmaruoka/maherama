import { PrismaClient } from '@prisma/client';
import { seedShrine } from './shrine';
import { seedDiety } from './diety';
import { seedShrineDiety } from './shrineDiety';
import { seedUser } from './user';
import { seedStats } from './stats';
import { seedLog } from './log';
import { seedFollow } from './follow';

const prisma = new PrismaClient();

async function main() {
  const shrineIds = await seedShrine(prisma);
  await seedDiety(prisma);
  await seedShrineDiety(prisma, shrineIds);
  await seedUser(prisma);
  await seedFollow(prisma);
  await seedLog(prisma);
  await seedStats(prisma);
  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
