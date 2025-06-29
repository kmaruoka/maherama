import { PrismaClient } from '@prisma/client';
import { seedShrine } from './shrine';
import { seedDiety } from './diety';
import { seedShrineDiety } from './shrineDiety';
import { seedUser } from './user';

const prisma = new PrismaClient();

async function main() {
  await seedShrine(prisma);
  await seedDiety(prisma);
  await seedShrineDiety(prisma);
  await seedUser(prisma);
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
