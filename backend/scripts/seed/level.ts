import { PrismaClient } from '@prisma/client';

/*
level | required_exp | pray_distance | worship_count
---------------------------------------------------
  1   |      0       |     100       |      1
  2   |     40       |     120       |      1
  3   |    140       |     140       |      1
  4   |    300       |     160       |      1
  5   |    520       |     180       |      1
  6   |    800       |     200       |      1
  7   |   1140       |     220       |      1
  8   |   1540       |     240       |      1
  9   |   2000       |     260       |      1
 10   |   2520       |     280       |      1
 11   |   3100       |     300       |      2
 12   |   3740       |     320       |      2
 13   |   4440       |     340       |      2
 14   |   5200       |     360       |      2
 15   |   6020       |     380       |      2
 16   |   6900       |     400       |      2
 17   |   7840       |     420       |      2
 18   |   8840       |     440       |      2
 19   |   9900       |     460       |      2
 20   |  11020       |     480       |      2
...
 80   |  63120       |    2380       |      8  // レベル80での距離
...
*/

export async function seedLevel(prisma: PrismaClient) {
  const levels: { level: number; required_exp: number; pray_distance: number; worship_count: number }[] = [];
  const maxLevel = 100;
  for (let level = 1; level <= maxLevel; level++) {
    // ゆるやかな二次関数: 10*(level-1)^2 + 30*(level-1)
    const required_exp = level === 1 ? 0 : Math.round(10 * Math.pow(level - 1, 2) + 30 * (level - 1));
    // 参拝距離・遥拝回数は現状維持
    let pray_distance = 100 + (level - 1) * 20; // 例: 100, 120, 140, ...
    if (level > 10) pray_distance += Math.floor((level - 10) * 10); // 10以降は少し伸びを緩やかに
    let worship_count = 1 + Math.floor((level - 1) / 10); // 10, 20, 30, ...で+1
    levels.push({ level, required_exp, pray_distance, worship_count });
  }

  await (prisma as any).levelMaster.createMany({
    data: levels,
    skipDuplicates: true,
  });
} 