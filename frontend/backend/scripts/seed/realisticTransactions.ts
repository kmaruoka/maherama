import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';
import { EARTH_RADIUS_METERS } from '../../shared/utils/distance';

// シミュレート日付管理
let simulateDate: Date | null = null;

// 現在日時を取得する関数（シミュレート日付がある場合はそれを使用）
function getCurrentDate(): Date {
  return simulateDate || new Date();
}

// シミュレート日付を設定（サーバーAPIも呼び出し）
async function setSimulateDate(dateString: string | null): Promise<{ success: boolean; message: string }> {
  if (dateString === null) {
    simulateDate = null;
    // サーバーのシミュレート日付もクリア
    try {
      await axios.delete(`http://localhost:${API_PORT}/api/simulate-date`);
    } catch (error) {
      console.error('サーバーのシミュレート日付クリアに失敗:', error);
    }
    return { success: true, message: 'シミュレート日付をクリアしました' };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { success: false, message: '無効な日付形式です' };
  }
  
  simulateDate = date;
  
  // サーバーのシミュレート日付も設定
  try {
    await axios.post(`http://localhost:${API_PORT}/api/simulate-date`, {
      date: dateString
    });
  } catch (error) {
    console.error('サーバーのシミュレート日付設定に失敗:', error);
  }
  
  return { success: true, message: `シミュレート日付を設定しました: ${date.toISOString()}` };
}

dotenv.config();

const API_PORT = process.env.API_PORT || 3000;
if (!API_PORT || isNaN(Number(API_PORT))) {
  throw new Error('API_PORTが未定義または不正です。.envや環境変数を確認してください');
}

// ========================================
// 設定（ここを変更してシミュレーションを調整）
// ========================================
// 日数を引数で取得（デフォルト10日）
// 使用方法: npm run seed または npm run seed 30 (30日間のシミュレーション)
const DAYS_TO_SIMULATE = parseInt(process.argv[2]) || 10;
const START_DATE = new Date(getCurrentDate().getTime() - DAYS_TO_SIMULATE * 24 * 60 * 60 * 1000); // 指定日数前から開始
const END_DATE = getCurrentDate(); // 現在まで
const PRAY_PROBABILITY = 0.5; // 1日あたりの参拝確率（0.0〜1.0）
const MAX_PRAYS_PER_DAY = 3; // 1日あたりの最大参拝回数

  // ユーザーのやりこみ度合い設定（ユーザーID: {最大レベル, 開始日}）
  const USER_ACTIVITY_LEVELS = {
    1: { maxLevel: 100, startDate: START_DATE }, // 最初から開始、レベル100で停止（ヘビーユーザー）
    2: { maxLevel: 80, startDate: new Date(START_DATE.getTime() + Math.min(30, DAYS_TO_SIMULATE * 0.3) * 24 * 60 * 60 * 1000) }, // 30%後に開始、レベル80で停止
    3: { maxLevel: 70, startDate: new Date(START_DATE.getTime() + Math.min(60, DAYS_TO_SIMULATE * 0.5) * 24 * 60 * 60 * 1000) }, // 50%後に開始、レベル70で停止
    4: { maxLevel: 60, startDate: new Date(START_DATE.getTime() + Math.min(90, DAYS_TO_SIMULATE * 0.6) * 24 * 60 * 60 * 1000) }, // 60%後に開始、レベル60で停止
    5: { maxLevel: 50, startDate: new Date(START_DATE.getTime() + Math.min(120, DAYS_TO_SIMULATE * 0.7) * 24 * 60 * 60 * 1000) }, // 70%後に開始、レベル50で停止
    6: { maxLevel: 40, startDate: new Date(START_DATE.getTime() + Math.min(150, DAYS_TO_SIMULATE * 0.8) * 24 * 60 * 60 * 1000) }, // 80%後に開始、レベル40で停止
    7: { maxLevel: 30, startDate: new Date(START_DATE.getTime() + Math.min(180, DAYS_TO_SIMULATE * 0.85) * 24 * 60 * 60 * 1000) }, // 85%後に開始、レベル30で停止
    8: { maxLevel: 20, startDate: new Date(START_DATE.getTime() + Math.min(210, DAYS_TO_SIMULATE * 0.9) * 24 * 60 * 60 * 1000) }, // 90%後に開始、レベル20で停止
    9: { maxLevel: 10, startDate: new Date(START_DATE.getTime() + Math.min(240, DAYS_TO_SIMULATE * 0.95) * 24 * 60 * 60 * 1000) }, // 95%後に開始、レベル10で停止
    10: { maxLevel: 1, startDate: new Date(START_DATE.getTime() + Math.min(270, DAYS_TO_SIMULATE * 0.98) * 24 * 60 * 60 * 1000) }, // 98%後に開始、レベル1で停止（初心者）
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
      return true;
    } else {
      console.error(`❌ 参拝失敗: ユーザー${userId}が神社${shrineId}を参拝 - ${response.status}`);
      return false;
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('connect ECONNREFUSED')) {
      console.error('[seedエラー] サーバーが起動していない、またはAPI_PORTが間違っています。');
    }
    if (error.response) {
      // 既に参拝済みの場合は正常な動作なのでスタックトレースを出力しない
      if (error.response.status === 400 && error.response.data.error && error.response.data.error.includes('既に参拝済み')) {
        // 正常な動作なのでログ出力しない
        return false;
      }
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
  
  try {
    console.log(`🔗 サーバーAPI呼び出し: http://localhost:${API_PORT}/admin/ranking-awards`);
    // サーバー側のAPIを呼び出してランキング集計と報酬付与を実行
    const response = await axios.post(`http://localhost:${API_PORT}/admin/ranking-awards`);
    console.log(`📡 API応答: ${response.status} ${response.statusText}`);
    if (response.status === 200) {
      console.log(`✅ 週間ランキング報酬付与が完了しました`);
    } else {
      console.error(`❌ 週間ランキング報酬付与に失敗: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`❌ 週間ランキング報酬付与エラー:`, error.message);
    if (error.response) {
      console.error(`📡 エラー詳細: ${error.response.status} ${error.response.statusText}`);
      console.error(`📡 レスポンス:`, error.response.data);
    }
  }
}

// ランキング1位の人に称号を付与する汎用関数
async function awardRankingTitles(
  prisma: PrismaClient, 
  period: 'yearly' | 'monthly', 
  currentDate: Date
) {
  console.log(`🏆 ${period}ランキング1位の称号付与処理を開始...`);
  
  try {
    const typeParam = period === 'yearly' ? 'yearly' : 'monthly';
    console.log(`🔗 サーバーAPI呼び出し: http://localhost:${API_PORT}/admin/ranking-awards?type=${typeParam}`);
    // サーバー側のAPIを呼び出してランキング集計と報酬付与を実行
    const response = await axios.post(`http://localhost:${API_PORT}/admin/ranking-awards?type=${typeParam}`);
    console.log(`📡 API応答: ${response.status} ${response.statusText}`);
    if (response.status === 200) {
      console.log(`✅ ${period}ランキング称号付与が完了しました`);
    } else {
      console.error(`❌ ${period}ランキング称号付与に失敗: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`❌ ${period}ランキング称号付与エラー:`, error.message);
    if (error.response) {
      console.error(`📡 エラー詳細: ${error.response.status} ${error.response.statusText}`);
      console.error(`📡 レスポンス:`, error.response.data);
    }
  }
}

// シード処理完了後に称号を付与する関数（サーバーAPI呼び出し）
async function awardTitlesAfterSeed(prisma: PrismaClient) {
  console.log('🏆 シード後の称号付与処理を開始...');
  
  try {
    // 月間ランキング称号付与
    console.log('月間ランキング称号付与中...');
    const monthlyResponse = await axios.post(`http://localhost:${API_PORT}/admin/ranking-awards?type=monthly`);
    console.log(`📡 月間称号付与API応答: ${monthlyResponse.status} ${monthlyResponse.statusText}`);
    
    // 年間ランキング称号付与
    console.log('年間ランキング称号付与中...');
    const yearlyResponse = await axios.post(`http://localhost:${API_PORT}/admin/ranking-awards?type=yearly`);
    console.log(`📡 年間称号付与API応答: ${yearlyResponse.status} ${yearlyResponse.statusText}`);
    
    console.log('✅ 称号付与処理が完了しました');
    
  } catch (error: any) {
    console.error('❌ 称号付与エラー:', error.message);
    if (error.response) {
      console.error(`📡 エラー詳細: ${error.response.status} ${error.response.statusText}`);
      console.error(`📡 レスポンス:`, error.response.data);
    }
  }
}

export async function seedRealisticTransactions(prisma: PrismaClient) {
  console.log(`🚀 リアルなトランザクションデータの生成を開始... (${DAYS_TO_SIMULATE}日間)`);
  
  // シミュレーション開始（DAYS_TO_SIMULATE日前から開始）
  const simulationStartDate = new Date(getCurrentDate().getTime() - DAYS_TO_SIMULATE * 24 * 60 * 60 * 1000);
  simulationStartDate.setHours(0, 0, 0, 0);
  await setSimulateDate(simulationStartDate.toISOString());
  console.log(`📅 シミュレーション開始日: ${simulationStartDate.toISOString()}`);
  
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
  await prisma.shrineCatalog.deleteMany();
  await prisma.dietyCatalog.deleteMany();
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
  let prevDay = currentDate.getDate();
  
  while (currentDate <= END_DATE) {
    // シミュレート日付を現在の日付に更新
    await setSimulateDate(currentDate.toISOString());
    
    // 日切り替え判定
    const currentDay = currentDate.getDate();
    if (currentDay !== prevDay) {
      console.log(`\n🗓 日切り替え検出: ${prevDay}→${currentDay}`);
      console.log(`\n🗓 日切り替え: ${prevDay}→${currentDay} 日次ランキングをリセット`);
      await prisma.shrinePrayStatsDaily.deleteMany();
      await prisma.dietyPrayStatsDaily.deleteMany();
      prevDay = currentDay;
    }
    
    // 年切り替え判定
    const currentYear = currentDate.getFullYear();
    if (currentYear !== prevYear) {
      console.log(`\n🗓 年度切り替え検出: ${prevYear}→${currentYear}`);
      // 年間ランキング1位に称号を付与
      await awardRankingTitles(prisma, 'yearly', new Date(prevYear, 11, 31));
      prevYear = currentYear;
    }
    // 月切り替え判定
    const currentMonth = currentDate.getMonth();
    if (currentMonth !== prevMonth) {
      console.log(`\n🗓 月度切り替え検出: ${prevMonth + 1}→${currentMonth + 1}`);
      // 月間ランキング1位に称号を付与
      await awardRankingTitles(prisma, 'monthly', new Date(currentDate.getFullYear(), prevMonth, 0));
      prevMonth = currentMonth;
    }
    // 週切り替え判定
    const currentWeek = getWeekNumber(currentDate);
    if (currentWeek !== prevWeek) {
      console.log(`\n🗓 週切り替え検出: ${prevWeek}→${currentWeek}`);
      // 週間ランキング1位に経験値・能力値のみ付与（称号なし）
      await awardWeeklyRewards(prisma, new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
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

  // 最終的なユーザーAP状況を確認
  console.log('\n📊 最終的なユーザーAP状況:');
  const finalUsers = await prisma.user.findMany({
    select: { id: true, name: true, level: true, exp: true, ability_points: true },
    orderBy: { id: 'asc' }
  });
  
  for (const user of finalUsers) {
    console.log(`[最終AP] ユーザー${user.id}(${user.name}): レベル${user.level}, EXP${user.exp}, AP${user.ability_points}`);
  }

  console.log('✅ トランザクションデータの生成が完了しました！');
  
  // シード処理完了後に称号を付与
  console.log('🏆 称号付与処理を開始...');
  await awardTitlesAfterSeed(prisma);
  console.log('🏆 称号付与処理が完了しました！');
  
  // シミュレーション終了（日付をクリア）
  await setSimulateDate(null);
  console.log('📅 シミュレーション終了: 日付をクリアしました');
}
