import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';
const { EARTH_RADIUS_METERS } = require('../../../shared/utils/distance');

dotenv.config();

const API_PORT = process.env.PORT || '3000';

// ========================================
// 設定（ここを変更してシミュレーションを調整）
// ========================================
const START_DATE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1年前から開始
const END_DATE = new Date(); // 現在まで
const PRAY_PROBABILITY = 1.0; // 1日あたりの参拝確率（0.0〜1.0）
const MAX_PRAYS_PER_DAY = 20; // 1日あたりの最大参拝回数（増加）

  // ユーザーのやりこみ度合い設定（ユーザーID: {最大レベル, 開始日}）
  const USER_ACTIVITY_LEVELS = {
    1: { maxLevel: 100, startDate: START_DATE }, // 最初から開始、レベル100で停止（ヘビーユーザー）
    2: { maxLevel: 80, startDate: new Date(START_DATE.getTime() + 30 * 24 * 60 * 60 * 1000) }, // 30日後に開始、レベル80で停止
    3: { maxLevel: 70, startDate: new Date(START_DATE.getTime() + 60 * 24 * 60 * 60 * 1000) }, // 60日後に開始、レベル70で停止
    4: { maxLevel: 60, startDate: new Date(START_DATE.getTime() + 90 * 24 * 60 * 60 * 1000) }, // 90日後に開始、レベル60で停止
    5: { maxLevel: 50, startDate: new Date(START_DATE.getTime() + 120 * 24 * 60 * 60 * 1000) }, // 120日後に開始、レベル50で停止
    6: { maxLevel: 40, startDate: new Date(START_DATE.getTime() + 150 * 24 * 60 * 60 * 1000) }, // 150日後に開始、レベル40で停止
    7: { maxLevel: 30, startDate: new Date(START_DATE.getTime() + 180 * 24 * 60 * 60 * 1000) }, // 180日後に開始、レベル30で停止
    8: { maxLevel: 20, startDate: new Date(START_DATE.getTime() + 210 * 24 * 60 * 60 * 1000) }, // 210日後に開始、レベル20で停止
    9: { maxLevel: 10, startDate: new Date(START_DATE.getTime() + 240 * 24 * 60 * 60 * 1000) }, // 240日後に開始、レベル10で停止
    10: { maxLevel: 1, startDate: new Date(START_DATE.getTime() + 270 * 24 * 60 * 60 * 1000) }, // 270日後に開始、レベル1で停止（初心者）
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

// 参拝APIをシミュレート（実際のAPIを呼び出し）
async function simulatePray(userId: number, shrineId: number, shrinePositions: { [key: number]: { lat: number; lng: number } }, timeMs?: number) {
  const pos = shrinePositions[shrineId];
  if (!pos || pos.lat == null || pos.lng == null) {
    console.error(`神社${shrineId}の座標が不正です`);
    return false;
  }
  try {
    const response = await axios.post(`http://localhost:${API_PORT}/shrines/${shrineId}/pray`, {
      lat: pos.lat,
      lng: pos.lng,
      ...(timeMs !== undefined ? { timeMs } : {})
    }, {
      headers: {
        'x-user-id': userId.toString()
      }
    });
    if (response.status === 200) {
      //console.log(`✅ 参拝成功: ユーザー${userId}が神社${shrineId}を参拝`);
      return true;
    } else {
      console.error(`❌ 参拝失敗: ユーザー${userId}が神社${shrineId}を参拝 - ${response.status}`);
      return false;
    }
  } catch (error: any) {
    if (error.response) {
      console.error('[seedエラー] 参拝APIエラー詳細:', error.response.status, error.response.data);
    }
    console.error('[seedエラー] 参拝シミュレーションエラー:', error.message, error.stack);
    return false;
  }
}

// 遥拝APIをシミュレート（実際のAPIを呼び出し）
async function simulateRemotePray(prisma: PrismaClient, userId: number, shrineId: number, prayDate: Date) {
  try {
    // 実際の遥拝APIを呼び出し
    const response = await axios.post(`http://localhost:${API_PORT}/shrines/${shrineId}/remote-pray`, {}, {
      headers: {
        'x-user-id': userId.toString()
      }
    });
    if (response.status === 200) {
      // console.log(`✅ 遥拝成功: ユーザー${userId}が神社${shrineId}を遥拝`); // ログ出力しない
      return true;
    } else {
      // console.error(`❌ 遥拝失敗: ユーザー${userId}が神社${shrineId}を遥拝 - ${response.status}`);
      return false;
    }
  } catch (error: any) {
    // 遥拝回数制限エラーは正常な動作
    if (error.response && error.response.status === 400 && error.response.data.error && error.response.data.error.includes('遥拝は1日に')) {
      // ログ出力しない
      return false;
    } else {
      // console.error(`遥拝シミュレーションエラー (User: ${userId}, Shrine: ${shrineId}):`, error);
      if (error.response) {
        console.error('[seedエラー] 遥拝APIエラー詳細:', error.response.status, error.response.data);
      }
      console.error('[seedエラー] 遥拝シミュレーションエラー:', error.message, error.stack);
      return false;
    }
  }
}

// 距離計算（Haversine公式）
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = EARTH_RADIUS_METERS;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

// 図鑑データをシミュレート（実際のAPIが自動生成するので不要）
async function simulateZukan(prisma: PrismaClient) {
  console.log('📚 図鑑データは実際のAPIが自動生成します');
}

// 週番号を取得する関数を追加
function getWeekNumber(date: Date): number {
  // ISO 8601週番号（1年の最初の木曜日を含む週が第1週）
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  // 木曜日に合わせる
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return (
    1 + Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

// 週間ランキング1位に経験値・能力値のみ付与する関数（称号なし）
async function awardWeeklyRewards(
  prisma: PrismaClient, 
  currentDate: Date
) {
  console.log(`🏆 週間ランキング1位の報酬付与処理を開始...`);
  
  const dateFormat = (date: Date) => `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
  const periodLabel = dateFormat(currentDate);
  
  try {
    // 神社ランキング1位を取得
    const shrineStats = await prisma.shrinePrayStatsWeekly.findMany({
      orderBy: { count: 'desc' },
      include: { 
        shrine: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      },
      take: 1,
    });
    
    // 神様ランキング1位を取得
    const dietyStats = await prisma.dietyPrayStatsWeekly.findMany({
      orderBy: { count: 'desc' },
      include: { 
        diety: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      },
      take: 1,
    });
    
    // 神社ランキング1位に経験値・能力値を付与
    if (shrineStats.length > 0 && shrineStats[0].count > 0) {
      const topShrine = shrineStats[0];
      const expReward = 100; // 週間は100EXP
      
      // 経験値を付与
      await prisma.user.update({
        where: { id: topShrine.user.id },
        data: { exp: { increment: expReward } }
      });
      
      console.log(`🏆 神社ランキング1位: ${topShrine.user.name} が週間報酬を獲得 (${expReward}EXP)`);
    }
    
    // 神様ランキング1位に経験値・能力値を付与
    if (dietyStats.length > 0 && dietyStats[0].count > 0) {
      const topDiety = dietyStats[0];
      const expReward = 100; // 週間は100EXP
      
      // 経験値を付与
      await prisma.user.update({
        where: { id: topDiety.user.id },
        data: { exp: { increment: expReward } }
      });
      
      console.log(`🏆 神様ランキング1位: ${topDiety.user.name} が週間報酬を獲得 (${expReward}EXP)`);
    }
    
  } catch (error) {
    console.error(`❌ 週間ランキング報酬付与エラー:`, error);
  }
}

// ランキング1位の人に称号を付与する汎用関数
async function awardRankingTitles(
  prisma: PrismaClient, 
  period: 'yearly' | 'monthly', 
  currentDate: Date
) {
  console.log(`🏆 ${period}ランキング1位の称号付与処理を開始...`);
  
  const periodText = {
    yearly: '年間',
    monthly: '月間'
  }[period];
  
  const dateFormat = {
    yearly: (date: Date) => `${date.getFullYear()}`,
    monthly: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }[period];
  
  const periodLabel = dateFormat(currentDate);
  
  try {
    // 神社ごとに1位ユーザーを取得
    let shrineStats;
    switch (period) {
      case 'yearly':
        shrineStats = await prisma.shrinePrayStatsYearly.findMany({
          orderBy: [{ shrine_id: 'asc' }, { count: 'desc' }],
          include: { shrine: true, user: true },
        });
        break;
      case 'monthly':
        shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
          orderBy: [{ shrine_id: 'asc' }, { count: 'desc' }],
          include: { shrine: true, user: true },
        });
        break;
    }
    // 神社ごとに1位ユーザーを抽出
    const shrineTopMap = new Map();
    for (const stat of shrineStats) {
      if (!shrineTopMap.has(stat.shrine_id) && stat.count > 0) {
        shrineTopMap.set(stat.shrine_id, stat);
      }
    }
    // 神社ごとに称号付与
    for (const [shrineId, topShrine] of shrineTopMap.entries()) {
      const titleName = `${periodText}参拝数1位<${topShrine.shrine.name}><${periodLabel}>`;
      const titleMaster = await prisma.titleMaster.findFirst({
        where: { code: `${period}_rank_shrine` }
      });
      if (!titleMaster) {
        console.log(`❌ ${period}_rank_shrine の称号テンプレートが見つかりません`);
        continue;
      }
      await prisma.userTitle.upsert({
        where: {
          user_id_title_id_embed_data: {
            user_id: topShrine.user.id,
            title_id: titleMaster.id,
            embed_data: {
              shrine: topShrine.shrine.name,
              shrine_id: topShrine.shrine.id,
              period: periodLabel
            }
          }
        },
        update: {},
        create: {
          user_id: topShrine.user.id,
          title_id: titleMaster.id,
          embed_data: {
            shrine: topShrine.shrine.name,
            shrine_id: topShrine.shrine.id,
            period: periodLabel
          }
        }
      });
      await prisma.user.update({
        where: { id: topShrine.user.id },
        data: { exp: { increment: titleMaster.exp_reward } }
      });
      console.log(`🏆 神社ランキング1位: ${topShrine.user.name} が「${titleName}」を獲得 (${titleMaster.exp_reward}EXP)`);
    }
    // 神様ごとに1位ユーザーを取得
    let dietyStats;
    switch (period) {
      case 'yearly':
        dietyStats = await prisma.dietyPrayStatsYearly.findMany({
          orderBy: [{ diety_id: 'asc' }, { count: 'desc' }],
          include: { diety: true, user: true },
        });
        break;
      case 'monthly':
        dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
          orderBy: [{ diety_id: 'asc' }, { count: 'desc' }],
          include: { diety: true, user: true },
        });
        break;
    }
    // 神様ごとに1位ユーザーを抽出
    const dietyTopMap = new Map();
    for (const stat of dietyStats) {
      if (!dietyTopMap.has(stat.diety_id) && stat.count > 0) {
        dietyTopMap.set(stat.diety_id, stat);
      }
    }
    // 神様ごとに称号付与
    for (const [dietyId, topDiety] of dietyTopMap.entries()) {
      const titleName = `${periodText}参拝数1位<${topDiety.diety.name}><${periodLabel}>`;
      const titleMaster = await prisma.titleMaster.findFirst({
        where: { code: `${period}_rank_diety` }
      });
      if (!titleMaster) {
        console.log(`❌ ${period}_rank_diety の称号テンプレートが見つかりません`);
        continue;
      }
      await prisma.userTitle.upsert({
        where: {
          user_id_title_id_embed_data: {
            user_id: topDiety.user.id,
            title_id: titleMaster.id,
            embed_data: {
              diety: topDiety.diety.name,
              diety_id: topDiety.diety.id,
              period: periodLabel
            }
          }
        },
        update: {},
        create: {
          user_id: topDiety.user.id,
          title_id: titleMaster.id,
          embed_data: {
            diety: topDiety.diety.name,
            diety_id: topDiety.diety.id,
            period: periodLabel
          }
        }
      });
      await prisma.user.update({
        where: { id: topDiety.user.id },
        data: { exp: { increment: titleMaster.exp_reward } }
      });
      console.log(`🏆 神様ランキング1位: ${topDiety.user.name} が「${titleName}」を獲得 (${titleMaster.exp_reward}EXP)`);
    }
  } catch (error) {
    console.error(`❌ ${period}ランキング称号付与エラー:`, error);
  }
}

export async function seedRealisticTransactions(prisma: PrismaClient) {
  console.log('🚀 リアルなトランザクションデータの生成を開始...');
  
  // 既存のトランザクションデータをクリア
  await prisma.shrinePray.deleteMany();
  await prisma.remotePray.deleteMany();
  await prisma.dietyPray.deleteMany();
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
  await prisma.abilityLog.deleteMany();

  // 神社の位置情報とIDを取得
  const shrinePositions = await getShrinePositions(prisma);
  const shrineIds = Object.keys(shrinePositions).map(id => parseInt(id));
  
  if (shrineIds.length === 0) {
    console.log('⚠️ 神社データが見つかりません。先に神社データをseedしてください。');
    return;
  }

  // 各ユーザーの参拝履歴をMapで管理
  const userPrayHistory: { [userId: number]: number[] } = {};

  // 日付を1日ずつ進めて参拝をシミュレート
  const currentDate = new Date(START_DATE);
  let prevYear = currentDate.getFullYear();
  let prevMonth = currentDate.getMonth();
  let prevWeek = getWeekNumber(currentDate);
  
  while (currentDate <= END_DATE) {
    // 年切り替え判定
    const currentYear = currentDate.getFullYear();
    if (currentYear !== prevYear) {
      // 年間ランキング1位に称号を付与
      await awardRankingTitles(prisma, 'yearly', new Date(prevYear, 11, 31));
      console.log(`\n🗓 年度切り替え: ${prevYear}→${currentYear} 年間ランキングをリセット`);
      await prisma.shrinePrayStatsYearly.deleteMany();
      await prisma.dietyPrayStatsYearly.deleteMany();
      prevYear = currentYear;
    }
    // 月切り替え判定
    const currentMonth = currentDate.getMonth();
    if (currentMonth !== prevMonth) {
      // 月間ランキング1位に称号を付与
      await awardRankingTitles(prisma, 'monthly', new Date(currentDate.getFullYear(), prevMonth, 0));
      console.log(`\n🗓 月度切り替え: ${prevMonth + 1}→${currentMonth + 1} 月間ランキングをリセット`);
      await prisma.shrinePrayStatsMonthly.deleteMany();
      await prisma.dietyPrayStatsMonthly.deleteMany();
      prevMonth = currentMonth;
    }
    // 週切り替え判定
    const currentWeek = getWeekNumber(currentDate);
    if (currentWeek !== prevWeek) {
      // 週間ランキング1位に経験値・能力値のみ付与（称号なし）
      await awardWeeklyRewards(prisma, new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
      console.log(`\n🗓 週切り替え: ${prevWeek}→${currentWeek} 週間ランキングをリセット`);
      await prisma.shrinePrayStatsWeekly.deleteMany();
      await prisma.dietyPrayStatsWeekly.deleteMany();
      prevWeek = currentWeek;
    }
    console.log(`📅 ${currentDate.toISOString().split('T')[0]} の参拝をシミュレート中...`);
    
    for (const [userId, activity] of Object.entries(USER_ACTIVITY_LEVELS)) {
      const userIdNum = parseInt(userId);
      if (currentDate < activity.startDate) continue;
      if (!userPrayHistory[userIdNum]) userPrayHistory[userIdNum] = [];

      // その日の参拝回数を決定
      const dailyPrayCount = Math.floor(Math.random() * MAX_PRAYS_PER_DAY) + 1;
      for (let i = 0; i < dailyPrayCount; i++) {
        // 参拝ごとに毎回レベルを取得
        const user = await prisma.user.findUnique({
          where: { id: userIdNum }
        });
        if (!user) {
          console.log(`[seedデバッグ] userが見つからない: userId=${userIdNum}`);
          break;
        }
        //console.log(`[seedデバッグ] userId=${userIdNum}, level=${user.level}, activity.maxLevel=${activity.maxLevel}`);
        if (user.level >= activity.maxLevel) {
          //console.log(`[seedデバッグ] user.level >= activity.maxLevelでbreak: userId=${userIdNum}, level=${user.level}, maxLevel=${activity.maxLevel}`);
          break;
        }
        // 参拝確率で判定（PRAY_PROBABILITY=1.0なら必ず参拝）
        const rand = Math.random();
        let shrineId: number | null = null;
        // 70%: 過去参拝神社から選ぶ
        if (userPrayHistory[userIdNum].length > 0 && rand < 0.7) {
          shrineId = userPrayHistory[userIdNum][Math.floor(Math.random() * userPrayHistory[userIdNum].length)];
        } else if (userPrayHistory[userIdNum].length > 0 && rand < 0.9) {
          // 20%: その近く（1km以内）の神社から選ぶ
          const lastShrineId = userPrayHistory[userIdNum][userPrayHistory[userIdNum].length - 1];
          const lastPos = shrinePositions[lastShrineId];
          const nearby = shrineIds.filter(id => {
            if (id === lastShrineId) return false;
            const pos = shrinePositions[id];
            return getDistanceMeters(lastPos.lat, lastPos.lng, pos.lat, pos.lng) <= 1000;
          });
          if (nearby.length > 0) {
            shrineId = nearby[Math.floor(Math.random() * nearby.length)];
          } else {
            shrineId = shrineIds[Math.floor(Math.random() * shrineIds.length)];
          }
        } else {
          // 10%: 完全ランダム
          shrineId = shrineIds[Math.floor(Math.random() * shrineIds.length)];
        }
        // 参拝時刻をランダムに設定（その日の9時〜18時の間）
        const prayTime = new Date(currentDate);
        prayTime.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
        //console.log(`[seedデバッグ] API呼び出し直前: userId=${userIdNum}, shrineId=${shrineId}`);
        await simulatePray(userIdNum, shrineId, shrinePositions, prayTime.getTime());
        // 参拝履歴に追加（重複も許容）
        userPrayHistory[userIdNum].push(shrineId);
        //console.log(`[seedデバッグ] API呼び出し直後: userId=${userIdNum}, shrineId=${shrineId}`);
      }
    }
    // 次の日へ
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // フォロー関係をシミュレート
  console.log('👥 フォロー関係をシミュレート中...');
  await simulateFollows(prisma);

  // 図鑑データは実際のAPIが自動生成するので不要
  console.log('📚 図鑑データは実際のAPIが自動生成します');

  // 統計データは実際のAPIが自動生成するので不要
  console.log('📊 統計データは実際のAPIが自動生成します');

  console.log('✅ リアルなトランザクションデータの生成が完了しました！');
}

// 統計データを再計算（実際のAPIが自動生成するので不要）
async function recalculateStats(prisma: PrismaClient) {
  console.log('📊 統計データは実際のAPIが自動生成します');
} 