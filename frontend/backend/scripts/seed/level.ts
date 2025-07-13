import { PrismaClient } from '@prisma/client';

/*
level | required_exp | pray_distance | worship_count | ability_points
--------------------------------------------------------------------
  1   |      0       |     100       |      1        |     100
  2   |     40       |     120       |      1        |     100
  3   |    140       |     140       |      1        |     100
  4   |    300       |     160       |      1        |     100
  5   |    520       |     180       |      1        |     100
  6   |    800       |     200       |      1        |     100
  7   |   1140       |     220       |      1        |     100
  8   |   1540       |     240       |      1        |     100
  9   |   2000       |     260       |      1        |     100
 10   |   2520       |     280       |      1        |     100
 11   |   3100       |     300       |      2        |     120
 12   |   3740       |     320       |      2        |     120
 13   |   4440       |     340       |      2        |     120
 14   |   5200       |     360       |      2        |     120
 15   |   6020       |     380       |      2        |     120
 16   |   6900       |     400       |      2        |     120
 17   |   7840       |     420       |      2        |     120
 18   |   8840       |     440       |      2        |     120
 19   |   9900       |     460       |      2        |     120
 20   |  11020       |     480       |      2        |     120
...
 80   |  63120       |    2380       |      8        |     200  // レベル80での距離
...
*/

export async function seedLevel(prisma: PrismaClient) {
  const levels: { level: number; required_exp: number; pray_distance: number; worship_count: number; ability_points: number }[] = [];
  const maxLevel = 100;
  for (let level = 1; level <= maxLevel; level++) {
    // ゆるやかな二次関数: 10*(level-1)^2 + 30*(level-1)
    const required_exp = level === 1 ? 0 : Math.round(10 * Math.pow(level - 1, 2) + 30 * (level - 1));
    // 参拝距離・遥拝回数は現状維持
    let pray_distance = 100 + (level - 1) * 10; // 例: 100, 110, 120, ...
    if (level > 10) pray_distance += Math.floor((level - 10) * 10); // 10以降は少し伸びを緩やかに
    let worship_count = 1 + Math.floor((level - 1) / 10); // 10, 20, 30, ...で+1
    
    // レベルに応じたAP獲得量を設定
    let ability_points = 100; // 基本値
    if (level >= 11 && level <= 20) ability_points = 120;      // レベル11-20: 120AP
    else if (level >= 21 && level <= 30) ability_points = 140; // レベル21-30: 140AP
    else if (level >= 31 && level <= 40) ability_points = 160; // レベル31-40: 160AP
    else if (level >= 41 && level <= 50) ability_points = 180; // レベル41-50: 180AP
    else if (level >= 51 && level <= 60) ability_points = 200; // レベル51-60: 200AP
    else if (level >= 61 && level <= 70) ability_points = 220; // レベル61-70: 220AP
    else if (level >= 71 && level <= 80) ability_points = 240; // レベル71-80: 240AP
    else if (level >= 81 && level <= 90) ability_points = 260; // レベル81-90: 260AP
    else if (level >= 91) ability_points = 280;                // レベル91+: 280AP
    
    levels.push({ level, required_exp, pray_distance, worship_count, ability_points });
  }

  await (prisma as any).levelMaster.createMany({
    data: levels,
    skipDuplicates: true,
  });
} 