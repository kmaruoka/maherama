const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, 'data.txt');
  const content = fs.readFileSync(filePath, 'utf-8');
  const sections = content.split(/\n{2,}/);

  const shrineMap = new Map();
  const dietyMap = new Map();

  for (const section of sections) {
    if (section.startsWith('[神社]')) {
      const lines = section.split('\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const [name, address, lat, lng, dietiesStr] = line.trim().split('\t');
        const shrine = await prisma.shrine.create({
          data: {
            name,
            address,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          },
        });
        shrineMap.set(name, shrine.id);
        const dieties = dietiesStr.split(',').map(s => s.trim());
        for (const d of dieties) {
          let dietyId;
          if (!dietyMap.has(d)) {
            const diety = await prisma.diety.create({
              data: { name: d }
            });
            dietyId = diety.id;
            dietyMap.set(d, dietyId);
          } else {
            dietyId = dietyMap.get(d);
          }
          await prisma.shrineDiety.create({
            data: {
              shrine_id: shrine.id,
              diety_id: dietyId
            }
          });
        }
      }
    } else if (section.startsWith('[神]')) {
      const lines = section.split('\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const [name, kana, description] = line.trim().split('\t');
        if (!dietyMap.has(name)) {
          const diety = await prisma.diety.create({
            data: {
              name,
              kana: kana || null,
              description: description || null
            }
          });
          dietyMap.set(name, diety.id);
        } else {
          await prisma.diety.update({
            where: { id: dietyMap.get(name) },
            data: {
              kana: kana || null,
              description: description || null
            }
          });
        }
      }
    }
  }
  console.log("Test data seeded.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
