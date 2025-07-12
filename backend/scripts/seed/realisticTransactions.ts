import { PrismaClient } from '@prisma/client';

// ========================================
// 設定（ここを変更してシミュレーションを調整）
// ========================================
const START_DATE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1年前から開始
const END_DATE = new Date(); // 現在まで
const PRAY_PROBABILITY = 0.3; // 1日あたりの参拝確率（0.0〜1.0）
const REMOTE_PRAY_PROBABILITY = 0.1; // 1日あたりの遥拝確率（0.0〜1.0）
const MAX_PRAYS_PER_DAY = 5; // 1日あたりの最大参拝回数

// ユーザーのやりこみ度合い設定（ユーザーID: {最大レベル, 開始日}）
const USER_ACTIVITY_LEVELS = {
  1: { maxLevel: 1, startDate: START_DATE }, // 開始直後で停止（初心者）
  2: { maxLevel: 10, startDate: new Date(START_DATE.getTime() + 30 * 24 * 60 * 60 * 1000) }, // 30日後に開始、レベル10で停止
  3: { maxLevel: 30, startDate: new Date(START_DATE.getTime() + 60 * 24 * 60 * 60 * 1000) }, // 60日後に開始、レベル30で停止
  4: { maxLevel: 50, startDate: new Date(START_DATE.getTime() + 90 * 24 * 60 * 60 * 1000) }, // 90日後に開始、レベル50で停止
  5: { maxLevel: 70, startDate: new Date(START_DATE.getTime() + 120 * 24 * 60 * 60 * 1000) }, // 120日後に開始、レベル70で停止
  6: { maxLevel: 90, startDate: new Date(START_DATE.getTime() + 150 * 24 * 60 * 60 * 1000) }, // 150日後に開始、レベル90で停止
  7: { maxLevel: 100, startDate: new Date(START_DATE.getTime() + 180 * 24 * 60 * 60 * 1000) }, // 180日後に開始、レベル100で停止
  8: { maxLevel: 100, startDate: new Date(START_DATE.getTime() + 210 * 24 * 60 * 60 * 1000) }, // 210日後に開始、レベル100で停止
  9: { maxLevel: 100, startDate: new Date(START_DATE.getTime() + 240 * 24 * 60 * 60 * 1000) }, // 240日後に開始、レベル100で停止
  10: { maxLevel: 100, startDate: new Date(START_DATE.getTime() + 270 * 24 * 60 * 60 * 1000) }, // 270日後に開始、レベル100で停止
};

// 神社の位置情報をデータベースから取得
async function getShrinePositions(prisma: PrismaClient) {
  const shrines = await prisma.shrine.findMany({
    select: { id: true, lat: true, lng: true }
  });
  
  const positions: { [key: number]: { lat: number; lng: number } } = {};
  for (const shrine of shrines) {
    positions[shrine.id] = { lat: shrine.lat, lng: shrine.lng };
  }
  
  return positions;
}

// 経験値計算（簡易版）
function calculateExpForLevel(level: number): number {
  return level * (level + 1) * 50;
}

// レベル計算
function calculateLevel(exp: number): number {
  let level = 1;
  while (calculateExpForLevel(level) <= exp) {
    level++;
  }
  return level - 1;
}

// 参拝APIをシミュレート
async function simulatePray(prisma: PrismaClient, userId: number, shrineId: number, prayDate: Date) {
  try {
    // 参拝記録を作成
    await prisma.shrinePray.create({
      data: {
        shrine_id: shrineId,
        user_id: userId,
        time: prayDate
      }
    });

    // 統計を更新
    const existingStats = await prisma.shrinePrayStats.findFirst({
      where: { shrine_id: shrineId, user_id: userId }
    });

    if (existingStats) {
      await prisma.shrinePrayStats.update({
        where: { id: existingStats.id },
        data: { count: existingStats.count + 1 }
      });
    } else {
      await prisma.shrinePrayStats.create({
        data: {
          shrine_id: shrineId,
          user_id: userId,
          count: 1,
          rank: 1
        }
      });
    }

    // ユーザーの経験値を更新
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user) {
      const newExp = user.exp + 10; // 参拝で10経験値
      const newLevel = calculateLevel(newExp);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          exp: newExp,
          level: newLevel,
          ability_points: user.ability_points + (newLevel > user.level ? 10 : 0) // レベルアップ時に10ポイント追加
        }
      });
    }

    // ログを追加
    const shrine = await prisma.shrine.findUnique({
      where: { id: shrineId },
      select: { name: true }
    });

    if (shrine) {
      await prisma.log.create({
        data: {
          message: `<user:${userId}:${user?.name || 'Unknown'}>が<shrine:${shrineId}:${shrine.name}>を参拝しました`,
          type: 'normal',
          time: prayDate
        }
      });
    }

    return true;
  } catch (error) {
    console.error(`参拝シミュレーションエラー (User: ${userId}, Shrine: ${shrineId}):`, error);
    return false;
  }
}

// 遥拝APIをシミュレート
async function simulateRemotePray(prisma: PrismaClient, userId: number, shrineId: number, prayDate: Date) {
  try {
    // 遥拝記録を作成
    await prisma.remotePray.create({
      data: {
        shrine_id: shrineId,
        user_id: userId,
        prayed_at: prayDate
      }
    });

    // 統計を更新（参拝と同じ）
    const existingStats = await prisma.shrinePrayStats.findFirst({
      where: { shrine_id: shrineId, user_id: userId }
    });

    if (existingStats) {
      await prisma.shrinePrayStats.update({
        where: { id: existingStats.id },
        data: { count: existingStats.count + 1 }
      });
    } else {
      await prisma.shrinePrayStats.create({
        data: {
          shrine_id: shrineId,
          user_id: userId,
          count: 1,
          rank: 1
        }
      });
    }

    // ユーザーの経験値を更新
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user) {
      const newExp = user.exp + 10; // 遥拝でも10経験値
      const newLevel = calculateLevel(newExp);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          exp: newExp,
          level: newLevel,
          ability_points: user.ability_points + (newLevel > user.level ? 10 : 0)
        }
      });
    }

    // ログを追加
    const shrine = await prisma.shrine.findUnique({
      where: { id: shrineId },
      select: { name: true }
    });

    if (shrine) {
      await prisma.log.create({
        data: {
          message: `<user:${userId}:${user?.name || 'Unknown'}>が<shrine:${shrineId}:${shrine.name}>を遥拝しました`,
          type: 'normal',
          time: prayDate
        }
      });
    }

    return true;
  } catch (error: any) {
    // P2002（ユニーク制約違反）は無視、それ以外は画面に出す
    if (error.code === 'P2002') {
      // 重複はスルー
      return false;
    } else {
      console.error(`遥拝シミュレーションエラー (User: ${userId}, Shrine: ${shrineId}):`, error);
      return false;
    }
  }
}

// フォロー関係をシミュレート
async function simulateFollows(prisma: PrismaClient) {
  const followRelations = [
    { follower_id: 1, following_id: 2 },
    { follower_id: 1, following_id: 3 },
    { follower_id: 2, following_id: 1 },
    { follower_id: 3, following_id: 1 },
    { follower_id: 3, following_id: 2 },
    { follower_id: 4, following_id: 1 },
    { follower_id: 5, following_id: 1 },
    { follower_id: 6, following_id: 1 },
    { follower_id: 7, following_id: 1 },
    { follower_id: 8, following_id: 1 },
    { follower_id: 9, following_id: 1 },
    { follower_id: 10, following_id: 1 },
  ];

  for (const relation of followRelations) {
    await prisma.follow.upsert({
      where: {
        follower_id_following_id: {
          follower_id: relation.follower_id,
          following_id: relation.following_id
        }
      },
      update: {},
      create: relation
    });
  }
}

// 図鑑データをシミュレート
async function simulateZukan(prisma: PrismaClient) {
  // 各ユーザーが参拝した神社を図鑑に追加
  const shrinePrays = await prisma.shrinePray.findMany({
    select: { user_id: true, shrine_id: true }
  });

  for (const pray of shrinePrays) {
    await prisma.shrineBook.upsert({
      where: {
        user_id_shrine_id: {
          user_id: pray.user_id,
          shrine_id: pray.shrine_id
        }
      },
      update: {},
      create: {
        user_id: pray.user_id,
        shrine_id: pray.shrine_id
      }
    });
  }

  // 神様の図鑑も追加（簡易版）
  const users = await prisma.user.findMany({ select: { id: true } });
  const dieties = await prisma.diety.findMany({ select: { id: true } });

  for (const user of users) {
    for (const diety of dieties) {
      if (Math.random() < 0.3) { // 30%の確率で図鑑に追加
        await prisma.dietyBook.upsert({
          where: {
            user_id_diety_id: {
              user_id: user.id,
              diety_id: diety.id
            }
          },
          update: {},
          create: {
            user_id: user.id,
            diety_id: diety.id
          }
        });
      }
    }
  }
}

export async function seedRealisticTransactions(prisma: PrismaClient) {
  console.log('🚀 リアルなトランザクションデータの生成を開始...');
  
  // 既存のトランザクションデータをクリア
  await prisma.shrinePray.deleteMany();
  await prisma.remotePray.deleteMany();
  await prisma.shrinePrayStats.deleteMany();
  await prisma.shrinePrayStatsYearly.deleteMany();
  await prisma.shrinePrayStatsMonthly.deleteMany();
  await prisma.shrinePrayStatsWeekly.deleteMany();
  await prisma.dietyPrayStats.deleteMany();
  await prisma.dietyPrayStatsYearly.deleteMany();
  await prisma.dietyPrayStatsMonthly.deleteMany();
  await prisma.dietyPrayStatsWeekly.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.shrineBook.deleteMany();
  await prisma.dietyBook.deleteMany();
  await prisma.log.deleteMany();

  // 神社の位置情報とIDを取得
  const shrinePositions = await getShrinePositions(prisma);
  const shrineIds = Object.keys(shrinePositions).map(id => parseInt(id));
  
  if (shrineIds.length === 0) {
    console.log('⚠️ 神社データが見つかりません。先に神社データをseedしてください。');
    return;
  }
  
  // 日付を1日ずつ進めて参拝をシミュレート
  const currentDate = new Date(START_DATE);
  
  while (currentDate <= END_DATE) {
    console.log(`📅 ${currentDate.toISOString().split('T')[0]} の参拝をシミュレート中...`);
    
    for (const [userId, activity] of Object.entries(USER_ACTIVITY_LEVELS)) {
      const userIdNum = parseInt(userId);
      
      // ユーザーの開始日をチェック
      if (currentDate < activity.startDate) {
        continue;
      }

      // ユーザーの現在レベルを取得
      const user = await prisma.user.findUnique({
        where: { id: userIdNum }
      });

      if (!user || user.level >= activity.maxLevel) {
        continue;
      }

      // その日の参拝回数を決定
      const dailyPrayCount = Math.floor(Math.random() * MAX_PRAYS_PER_DAY) + 1;
      
      for (let i = 0; i < dailyPrayCount; i++) {
        // 参拝するか遥拝するかを決定
        const isRemotePray = Math.random() < REMOTE_PRAY_PROBABILITY;
        const prayProbability = isRemotePray ? REMOTE_PRAY_PROBABILITY : PRAY_PROBABILITY;
        
        if (Math.random() < prayProbability) {
          // ランダムに神社を選択
          const shrineId = shrineIds[Math.floor(Math.random() * shrineIds.length)];
          
          // 参拝時刻をランダムに設定（その日の9時〜18時の間）
          const prayTime = new Date(currentDate);
          prayTime.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
          
          if (isRemotePray) {
            await simulateRemotePray(prisma, userIdNum, shrineId, prayTime);
          } else {
            await simulatePray(prisma, userIdNum, shrineId, prayTime);
          }
        }
      }
    }
    
    // 次の日へ
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // フォロー関係をシミュレート
  console.log('👥 フォロー関係をシミュレート中...');
  await simulateFollows(prisma);

  // 図鑑データをシミュレート
  console.log('📚 図鑑データをシミュレート中...');
  await simulateZukan(prisma);

  // 統計データを再計算
  console.log('📊 統計データを再計算中...');
  await recalculateStats(prisma);

  console.log('✅ リアルなトランザクションデータの生成が完了しました！');
}

// 統計データを再計算
async function recalculateStats(prisma: PrismaClient) {
  // 通算統計を再計算
  const shrinePrays = await prisma.shrinePray.groupBy({
    by: ['shrine_id', 'user_id'],
    _count: { shrine_id: true }
  });

  for (const pray of shrinePrays) {
    await prisma.shrinePrayStats.upsert({
      where: {
        shrine_id_user_id: {
          shrine_id: pray.shrine_id,
          user_id: pray.user_id
        }
      },
      update: { count: pray._count.shrine_id || 0 },
      create: {
        shrine_id: pray.shrine_id,
        user_id: pray.user_id,
        count: pray._count.shrine_id || 0,
        rank: 1
      }
    });
  }

  // 年別統計を再計算（簡易版）
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  const yearlyPrays = await prisma.shrinePray.groupBy({
    by: ['shrine_id', 'user_id'],
    where: {
      time: {
        gte: yearStart,
        lt: yearEnd
      }
    },
    _count: { shrine_id: true }
  });

  for (const pray of yearlyPrays) {
    await prisma.shrinePrayStatsYearly.upsert({
      where: {
        shrine_id_user_id: {
          shrine_id: pray.shrine_id,
          user_id: pray.user_id
        }
      },
      update: { count: pray._count.shrine_id || 0 },
      create: {
        shrine_id: pray.shrine_id,
        user_id: pray.user_id,
        count: pray._count.shrine_id || 0,
        rank: 1
      }
    });
  }

  // 月別統計を再計算（簡易版）
  const currentMonth = new Date().getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 1);

  const monthlyPrays = await prisma.shrinePray.groupBy({
    by: ['shrine_id', 'user_id'],
    where: {
      time: {
        gte: monthStart,
        lt: monthEnd
      }
    },
    _count: { shrine_id: true }
  });

  for (const pray of monthlyPrays) {
    await prisma.shrinePrayStatsMonthly.upsert({
      where: {
        shrine_id_user_id: {
          shrine_id: pray.shrine_id,
          user_id: pray.user_id
        }
      },
      update: { count: pray._count.shrine_id || 0 },
      create: {
        shrine_id: pray.shrine_id,
        user_id: pray.user_id,
        count: pray._count.shrine_id || 0,
        rank: 1
      }
    });
  }

  // 週別統計を再計算（簡易版）
  const currentWeek = new Date();
  currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
  currentWeek.setHours(0, 0, 0, 0);
  const weekEnd = new Date(currentWeek);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weeklyPrays = await prisma.shrinePray.groupBy({
    by: ['shrine_id', 'user_id'],
    where: {
      time: {
        gte: currentWeek,
        lt: weekEnd
      }
    },
    _count: { shrine_id: true }
  });

  for (const pray of weeklyPrays) {
    await prisma.shrinePrayStatsWeekly.upsert({
      where: {
        shrine_id_user_id: {
          shrine_id: pray.shrine_id,
          user_id: pray.user_id
        }
      },
      update: { count: pray._count.shrine_id || 0 },
      create: {
        shrine_id: pray.shrine_id,
        user_id: pray.user_id,
        count: pray._count.shrine_id || 0,
        rank: 1
      }
    });
  }
} 