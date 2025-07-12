import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_PORT = process.env.PORT || '3000';

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
  3: { maxLevel: 20, startDate: new Date(START_DATE.getTime() + 60 * 24 * 60 * 60 * 1000) }, // 60日後に開始、レベル20で停止
  4: { maxLevel: 30, startDate: new Date(START_DATE.getTime() + 90 * 24 * 60 * 60 * 1000) }, // 90日後に開始、レベル30で停止
  5: { maxLevel: 40, startDate: new Date(START_DATE.getTime() + 120 * 24 * 60 * 60 * 1000) }, // 120日後に開始、レベル40で停止
  6: { maxLevel: 50, startDate: new Date(START_DATE.getTime() + 150 * 24 * 60 * 60 * 1000) }, // 150日後に開始、レベル50で停止
  7: { maxLevel: 60, startDate: new Date(START_DATE.getTime() + 180 * 24 * 60 * 60 * 1000) }, // 180日後に開始、レベル60で停止
  8: { maxLevel: 70, startDate: new Date(START_DATE.getTime() + 210 * 24 * 60 * 60 * 1000) }, // 210日後に開始、レベル70で停止
  9: { maxLevel: 80, startDate: new Date(START_DATE.getTime() + 240 * 24 * 60 * 60 * 1000) }, // 240日後に開始、レベル80で停止
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

// 参拝APIをシミュレート（実際のAPIを呼び出し）
async function simulatePray(prisma: PrismaClient, userId: number, shrineId: number, prayDate: Date) {
  try {
    // 神社の位置情報を取得
    const shrine = await prisma.shrine.findUnique({
      where: { id: shrineId },
      select: { lat: true, lng: true }
    });

    if (!shrine) {
      console.error(`神社が見つかりません: ${shrineId}`);
      return false;
    }

    // 実際の参拝APIを呼び出し
    const response = await axios.post(`http://localhost:${API_PORT}/shrines/${shrineId}/pray`, {
      lat: shrine.lat,
      lng: shrine.lng
    }, {
      headers: {
        'x-user-id': userId.toString()
      }
    });

    if (response.status === 200) {
      console.log(`✅ 参拝成功: ユーザー${userId}が神社${shrineId}を参拝`);
      return true;
    } else {
      console.error(`❌ 参拝失敗: ユーザー${userId}が神社${shrineId}を参拝 - ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`参拝シミュレーションエラー (User: ${userId}, Shrine: ${shrineId}):`, error);
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
      console.log(`✅ 遥拝成功: ユーザー${userId}が神社${shrineId}を遥拝`);
      return true;
    } else {
      console.error(`❌ 遥拝失敗: ユーザー${userId}が神社${shrineId}を遥拝 - ${response.status}`);
      return false;
    }
  } catch (error: any) {
    // 遥拝回数制限エラーは正常な動作
    if (error.response && error.response.status === 400 && error.response.data.error && error.response.data.error.includes('遥拝は1日に')) {
      console.log(`ℹ️ 遥拝制限: ユーザー${userId}の遥拝回数制限に達しました`);
      return false;
    } else {
      console.error(`遥拝シミュレーションエラー (User: ${userId}, Shrine: ${shrineId}):`, error);
      if (error.response) {
        console.error(`レスポンス詳細: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
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

// 図鑑データをシミュレート（実際のAPIが自動生成するので不要）
async function simulateZukan(prisma: PrismaClient) {
  console.log('📚 図鑑データは実際のAPIが自動生成します');
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
  
  // 日付を1日ずつ進めて参拝をシミュレート
  const currentDate = new Date(START_DATE);
  
  while (currentDate <= END_DATE) {
    console.log(`📅 ${currentDate.toISOString().split('T')[0]} の参拝をシミュレート中...`);
    
    for (const [userId, activity] of Object.entries(USER_ACTIVITY_LEVELS)) {
      const userIdNum = parseInt(userId);
      if (currentDate < activity.startDate) continue;

      // その日の参拝回数を決定
      const dailyPrayCount = Math.floor(Math.random() * MAX_PRAYS_PER_DAY) + 1;
      for (let i = 0; i < dailyPrayCount; i++) {
        // 参拝・遥拝ごとに毎回レベルを取得
        const user = await prisma.user.findUnique({
          where: { id: userIdNum }
        });
        if (!user || user.level >= activity.maxLevel) break; // その日の残りもスキップ

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