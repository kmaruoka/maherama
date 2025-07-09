require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
// Stripe初期化（APIキーが設定されている場合のみ）
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// 環境変数のチェック
if (!process.env.PORT) {
  console.error('エラー: PORT環境変数が設定されていません');
  console.error('例: PORT=3001 npm start');
  process.exit(1);
}

const app = express();
const port = parseInt(process.env.PORT, 10);

// ポート番号の妥当性チェック
if (isNaN(port) || port < 1 || port > 65535) {
  console.error('エラー: 無効なポート番号です:', process.env.PORT);
  console.error('有効な範囲: 1-65535');
  process.exit(1);
}

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

let lastRemotePray = null;
const REMOTE_INTERVAL_DAYS = 7;

// 経験値獲得の種類
const EXP_REWARDS = {
  PRAY: 10,           // 参拝
  REMOTE_PRAY: 10,    // 遥拝
  IMAGE_POST: 10,     // 画像投稿
  HISTORY_POST: 10,   // 伝承投稿
  TITLE_ACQUISITION: 50, // 称号獲得（基本）
  SHRINE_APPROVAL: 500,  // 神社申請→承認
};

// 経験値を追加し、レベルアップをチェックする
async function addExperience(userId, expAmount) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, exp: true, ability_points: true }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const newExp = user.exp + expAmount;
    
    const currentLevelMaster = await tx.levelMaster.findUnique({
      where: { level: user.level }
    });

    if (!currentLevelMaster) {
      throw new Error(`Level master not found for level: ${user.level}`);
    }

    const nextLevelMaster = await tx.levelMaster.findUnique({
      where: { level: user.level + 1 }
    });

    let newLevel = user.level;
    let levelUp = false;
    let abilityPointsGained = 0;

    if (nextLevelMaster && newExp >= nextLevelMaster.required_exp) {
      newLevel = nextLevelMaster.level;
      levelUp = true;
      abilityPointsGained = 1;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        exp: newExp,
        level: newLevel,
        ability_points: user.ability_points + abilityPointsGained
      }
    });

    return {
      newLevel,
      levelUp,
      abilityPointsGained
    };
  });
}

// ユーザーの現在の参拝距離を取得
async function getUserPrayDistance(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const levelMaster = await prisma.levelMaster.findUnique({
    where: { level: user.level }
  });

  if (!levelMaster) {
    throw new Error(`Level master not found for level: ${user.level}`);
  }

  let baseDistance = levelMaster.pray_distance;

  const rangeAbilities = await prisma.userAbility.findMany({
    where: {
      user_id: userId,
      ability: {
        effect_type: 'range'
      }
    },
    include: {
      ability: true
    }
  });

  // レベル制廃止: effect_valueの合計のみ加算
  const additionalDistance = rangeAbilities.reduce((sum, userAbility) => {
    return sum + userAbility.ability.effect_value;
  }, 0);

  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      user_id: userId,
      subscription_type: 'range_multiplier',
      is_active: true,
      expires_at: {
        gt: new Date()
      }
    }
  });

  const totalDistance = baseDistance + additionalDistance;
  
  if (activeSubscription) {
    return totalDistance * 2;
  }

  return totalDistance;
}

// ユーザーの1日の遥拝回数を取得
async function getUserWorshipCount(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const levelMaster = await prisma.levelMaster.findUnique({
    where: { level: user.level }
  });

  if (!levelMaster) {
    throw new Error(`Level master not found for level: ${user.level}`);
  }

  let baseCount = levelMaster.worship_count;

  const worshipAbilities = await prisma.userAbility.findMany({
    where: {
      user_id: userId,
      ability: {
        effect_type: 'worship'
      }
    },
    include: {
      ability: true
    }
  });

  const additionalCount = worshipAbilities.reduce((sum, userAbility) => {
    return sum + userAbility.ability.effect_value;
  }, 0);

  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      user_id: userId,
      subscription_type: 'worship_boost',
      is_active: true,
      expires_at: {
        gt: new Date()
      }
    }
  });

  const totalCount = baseCount + additionalCount;
  
  if (activeSubscription) {
    return totalCount + 1;
  }

  return totalCount;
}

// 今日の遥拝回数を取得
async function getTodayWorshipCount(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.remotePray.count({
    where: {
      user_id: userId,
      prayed_at: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  return count;
}

// 能力を購入できるかチェック
async function canPurchaseAbility(userId, abilityId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ability_points: true }
  });

  if (!user) {
    return { canPurchase: false, reason: 'User not found' };
  }

  const ability = await prisma.abilityMaster.findUnique({
    where: { id: abilityId }
  });

  if (!ability) {
    return { canPurchase: false, reason: 'Ability not found' };
  }

  const existingAbility = await prisma.userAbility.findUnique({
    where: {
      user_id_ability_id: {
        user_id: userId,
        ability_id: abilityId
      }
    }
  });

  if (existingAbility) {
    return { canPurchase: false, reason: 'Already purchased' };
  }

  if (user.ability_points < ability.cost) {
    return { canPurchase: false, reason: 'Insufficient ability points' };
  }

  return { canPurchase: true };
}

// 能力を購入
async function purchaseAbility(userId, abilityId) {
  const checkResult = await canPurchaseAbility(userId, abilityId);
  
  if (!checkResult.canPurchase) {
    return { success: false, reason: checkResult.reason };
  }

  const ability = await prisma.abilityMaster.findUnique({
    where: { id: abilityId }
  });

  if (!ability) {
    return { success: false, reason: 'Ability not found' };
  }

  const cost = ability.cost;
  if (typeof cost !== 'number' || isNaN(cost) || cost <= 0) {
    return { success: false, reason: 'Invalid ability cost' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        ability_points: {
          decrement: cost
        }
      }
    });

    await tx.userAbility.create({
      data: {
        user_id: userId,
        ability_id: abilityId
      }
    });

    await tx.abilityLog.create({
      data: {
        user_id: userId,
        ability_id: abilityId,
        points_spent: cost
      }
    });
  });

  return { success: true };
}

// 古い関数（後方互換性のため残す）
function getRadiusFromSlots(slots) {
  if (slots === 0) return 100;
  return 100 * Math.pow(2, slots);
}

async function getUserSubscription(userId) {
  const subscription = await prisma.userSubscription.findFirst({
    where: { 
      user_id: userId,
      is_active: true,
      expires_at: { gt: new Date() }
    },
    orderBy: { created_at: 'desc' }
  });
  return subscription || { slots: 0 };
}

async function addLog(message, type = 'normal') {
  await prisma.log.create({
    data: {
      message,
      type
    }
  });
}

// 古い経験値システム（後方互換性のため残す）
async function gainExp(userId, amount) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  let exp = user.exp + amount;
  let level = user.level;
  let abilityPoints = user.ability_points;
  let required = (level + 1) * (level + 1) * 10;
  while (exp >= required) {
    level += 1;
    abilityPoints += 100;
    required = (level + 1) * (level + 1) * 10;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { exp, level, ability_points: abilityPoints },
  });
}

// 全神社（参拝数0も含む）を返すAPI
app.get('/shrines/all', async (req, res) => {
  try {
    const shrines = await prisma.shrine.findMany({
      select: {
        id: true,
        name: true,
        kana: true,
        location: true,
        lat: true,
        lng: true,
        registered_at: true,
        thumbnailUrl: true,
        thumbnailBy: true,
        founded: true,
        history: true,
        festivals: true,
        description: true,
        shrine_dieties: {
          select: {
            diety: {
              select: { id: true, name: true, kana: true }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    const shrineCounts = await prisma.shrinePrayStats.groupBy({
      by: ['shrine_id'],
      _sum: { count: true }
    });
    const countMap = Object.fromEntries(
      shrineCounts.map((c) => [c.shrine_id, c._sum.count || 0])
    );

    const formattedShrines = shrines.map((shrine) => ({
      ...shrine,
      count: countMap[shrine.id] || 0,
      registeredAt: shrine.registered_at,
      dieties: (shrine.shrine_dieties || []).map(sd => sd.diety)
    }));
    //console.log(`/shrines/all: ${formattedShrines.length}件返却`);
    
    res.json(formattedShrines);
  } catch (err) {
    console.error('Error fetching all shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/shrines', async (req, res) => {
  try {
    const shrines = await prisma.shrine.findMany({
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        registered_at: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    const shrineCounts = await prisma.shrinePrayStats.groupBy({
      by: ['shrine_id'],
      _sum: { count: true }
    });
    // count > 0 のみ抽出
    const countMap = Object.fromEntries(
      shrineCounts.filter(c => (c._sum.count || 0) > 0).map((c) => [c.shrine_id, c._sum.count || 0])
    );
    // 対象IDのみ
    const filteredShrines = shrines.filter(s => countMap[s.id] > 0);

    const formattedShrines = filteredShrines.map((shrine) => ({
      id: shrine.id,
      name: shrine.name,
      lat: shrine.lat,
      lng: shrine.lng,
      count: countMap[shrine.id] || 0,
      registeredAt: shrine.registered_at
    }));
    
    res.json(formattedShrines);
  } catch (err) {
    console.error('Error fetching shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/shrines/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        kana: true,
        location: true,
        lat: true,
        lng: true,
        registered_at: true,
        thumbnailUrl: true,
        thumbnailBy: true,
        founded: true,
        history: true,
        festivals: true,
        description: true,
        shrine_dieties: {
          select: {
            diety: {
              select: { id: true, name: true, kana: true }
            }
          }
        }
      }
    });

    const countData = await prisma.shrinePrayStats.aggregate({
      where: { shrine_id: id },
      _sum: { count: true }
    });
    const totalCount = countData._sum.count || 0;
    
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const formattedShrine = {
      ...shrine,
      count: totalCount,
      registeredAt: shrine.registered_at,
      dieties: shrine.shrine_dieties.map(sd => sd.diety)
    };
    // dieties配列をログ出力
    console.log('API /shrines/:id dieties:', formattedShrine.dieties);
    
    res.json(formattedShrine);
  } catch (err) {
    console.error('Error fetching shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/shrines/:id/pray', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid shrine ID' });
  }
  try {
    // 神社名と神様リレーションも取得（diety_id全件）
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: {
        name: true,
        lat: true,
        lng: true,
        shrine_dieties: { select: { diety_id: true } }
      }
    });
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    // ユーザーIDをリクエストヘッダーから取得（なければ1）
    const userId = parseInt(req.headers['x-user-id']) || 1;
    if (!userId || isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid or missing x-user-id header' });
    }
    // 新しいレベルシステムで参拝距離を取得
    const prayDistance = await getUserPrayDistance(userId);
    
    // 距離チェック
    if (req.body.lat && req.body.lng) {
      const toRad = (x) => x * Math.PI / 180;
      const R = 6371000;
      const dLat = toRad(req.body.lat - shrine.lat);
      const dLng = toRad(req.body.lng - shrine.lng);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(shrine.lat)) * Math.cos(toRad(req.body.lat)) * Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = R * c;
      if (dist > prayDistance) {
        return res.status(400).json({ error: '現在地が神社から離れすぎています', dist, radius: prayDistance });
      }
    } else {
      return res.status(400).json({ error: '緯度・経度がリクエストボディに含まれていません' });
    }
    // --- 参拝ログ保存 ---
    await prisma.shrinePray.create({ data: { shrine_id: id, user_id: userId } });
    // 取得した祭神IDをログ出力
    console.log('shrine_dieties:', shrine.shrine_dieties);
    const shrineStats = await prisma.shrinePrayStats.findFirst({ where: { shrine_id: id, user_id: userId } });
    if (shrineStats) {
      await prisma.shrinePrayStats.update({ where: { id: shrineStats.id }, data: { count: shrineStats.count + 1 } });
    } else {
      await prisma.shrinePrayStats.create({ data: { shrine_id: id, user_id: userId, count: 1, rank: 1 } });
    }
    const shrineStatsYearly = await prisma.shrinePrayStatsYearly.findFirst({ where: { shrine_id: id, user_id: userId } });
    if (shrineStatsYearly) {
      await prisma.shrinePrayStatsYearly.update({ where: { id: shrineStatsYearly.id }, data: { count: shrineStatsYearly.count + 1 } });
    } else {
      await prisma.shrinePrayStatsYearly.create({ data: { shrine_id: id, user_id: userId, count: 1, rank: 1 } });
    }
    const shrineStatsMonthly = await prisma.shrinePrayStatsMonthly.findFirst({ where: { shrine_id: id, user_id: userId } });
    if (shrineStatsMonthly) {
      await prisma.shrinePrayStatsMonthly.update({ where: { id: shrineStatsMonthly.id }, data: { count: shrineStatsMonthly.count + 1 } });
    } else {
      await prisma.shrinePrayStatsMonthly.create({ data: { shrine_id: id, user_id: userId, count: 1, rank: 1 } });
    }
    const shrineStatsWeekly = await prisma.shrinePrayStatsWeekly.findFirst({ where: { shrine_id: id, user_id: userId } });
    if (shrineStatsWeekly) {
      await prisma.shrinePrayStatsWeekly.update({ where: { id: shrineStatsWeekly.id }, data: { count: shrineStatsWeekly.count + 1 } });
    } else {
      await prisma.shrinePrayStatsWeekly.create({ data: { shrine_id: id, user_id: userId, count: 1, rank: 1 } });
    }
    // --- 神様カウント ---
    // shrine.shrine_dietiesが配列で全件取得できているか再確認し、全てのdiety_idに対して+1
    for (const sd of shrine.shrine_dieties) {
      await prisma.dietyPray.create({ data: { diety_id: sd.diety_id, user_id: userId } });
      const dietyId = sd.diety_id;
      const dietyStats = await prisma.dietyPrayStats.findFirst({ where: { diety_id: dietyId, user_id: userId } });
      if (dietyStats) {
        await prisma.dietyPrayStats.update({ where: { id: dietyStats.id }, data: { count: dietyStats.count + 1 } });
      } else {
        await prisma.dietyPrayStats.create({ data: { diety_id: dietyId, user_id: userId, count: 1, rank: 1 } });
      }
      const dietyStatsYearly = await prisma.dietyPrayStatsYearly.findFirst({ where: { diety_id: dietyId, user_id: userId } });
      if (dietyStatsYearly) {
        await prisma.dietyPrayStatsYearly.update({ where: { id: dietyStatsYearly.id }, data: { count: dietyStatsYearly.count + 1 } });
      } else {
        await prisma.dietyPrayStatsYearly.create({ data: { diety_id: dietyId, user_id: userId, count: 1, rank: 1 } });
      }
      const dietyStatsMonthly = await prisma.dietyPrayStatsMonthly.findFirst({ where: { diety_id: dietyId, user_id: userId } });
      if (dietyStatsMonthly) {
        await prisma.dietyPrayStatsMonthly.update({ where: { id: dietyStatsMonthly.id }, data: { count: dietyStatsMonthly.count + 1 } });
      } else {
        await prisma.dietyPrayStatsMonthly.create({ data: { diety_id: dietyId, user_id: userId, count: 1, rank: 1 } });
      }
      const dietyStatsWeekly = await prisma.dietyPrayStatsWeekly.findFirst({ where: { diety_id: dietyId, user_id: userId } });
      if (dietyStatsWeekly) {
        await prisma.dietyPrayStatsWeekly.update({ where: { id: dietyStatsWeekly.id }, data: { count: dietyStatsWeekly.count + 1 } });
      } else {
        await prisma.dietyPrayStatsWeekly.create({ data: { diety_id: dietyId, user_id: userId, count: 1, rank: 1 } });
      }
    }
    // 更新後の総参拝数を取得
    const totalCount = await prisma.shrinePrayStats.aggregate({
      where: { shrine_id: id },
      _sum: { count: true }
    });
    
    // 新しい経験値システムで経験値を追加
    const expResult = await addExperience(userId, EXP_REWARDS.PRAY);
    
    await addLog(`<shrine:${id}:${shrine.name}>を参拝しました`);
    res.json({ 
      success: true, 
      count: totalCount._sum.count || 0,
      level_up: expResult.levelUp,
      new_level: expResult.newLevel,
      ability_points_gained: expResult.abilityPointsGained
    });
  } catch (err) {
    console.error('Error praying at shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/shrines/:id/remote-pray', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: { name: true }
    });
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // ユーザーIDをリクエストヘッダーから取得（なければ1）
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const now = new Date();
    
    // 新しいレベルシステムで遥拝回数制限をチェック
    const maxWorshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);
    
    if (todayWorshipCount >= maxWorshipCount) {
      return res.status(400).json({ 
        error: `遥拝は1日に${maxWorshipCount}回までです（今日の使用回数: ${todayWorshipCount}回）` 
      });
    }
    
    // 遥拝記録を追加
    await prisma.remotePray.create({
      data: { shrine_id: id, user_id: userId, prayed_at: now }
    });
    
    // ShrinePrayStatsテーブルも更新
    const existingStats = await prisma.shrinePrayStats.findFirst({
      where: { shrine_id: id, user_id: userId }
    });
    if (existingStats) {
      await prisma.shrinePrayStats.update({
        where: { id: existingStats.id },
        data: { count: existingStats.count + 1 }
      });
    } else {
      await prisma.shrinePrayStats.create({
        data: {
          shrine_id: id,
          user_id: userId,
          count: 1,
          rank: 1
        }
      });
    }
    
    // 総参拝数
    const totalCount = await prisma.shrinePrayStats.aggregate({
      where: { shrine_id: id },
      _sum: { count: true }
    });
    
    // 新しい経験値システムで経験値を追加
    const expResult = await addExperience(userId, EXP_REWARDS.REMOTE_PRAY);
    
    await addLog(`<shrine:${id}:${shrine.name}>を遥拝しました`);
    res.json({ 
      success: true, 
      count: totalCount._sum.count || 0,
      level_up: expResult.levelUp,
      new_level: expResult.newLevel,
      ability_points_gained: expResult.abilityPointsGained
    });
  } catch (err) {
    console.error('Error remote praying at shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/dieties', async (req, res) => {
  try {
    const dieties = await prisma.diety.findMany({
      select: {
        id: true,
        name: true,
        registered_at: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    const dietyCounts = await prisma.dietyPrayStats.groupBy({
      by: ['diety_id'],
      _sum: { count: true }
    });
    // count > 0 のみ抽出
    const countMap = Object.fromEntries(
      dietyCounts.filter(c => (c._sum.count || 0) > 0).map((c) => [c.diety_id, c._sum.count || 0])
    );
    // 対象IDのみ
    const filteredDieties = dieties.filter(d => countMap[d.id] > 0);

    const formatted = filteredDieties.map((d) => ({
      id: d.id,
      name: d.name,
      count: countMap[d.id] || 0,
      registeredAt: d.registered_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching dieties:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/dieties/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  // デバッグ用ログ
  console.log('Diety ID parameter:', req.params.id, 'Parsed ID:', id);
  
  // IDが無効な値の場合はエラーを返す
  if (isNaN(id) || id <= 0) {
    console.error('Invalid diety ID:', req.params.id);
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  
  try {
    const diety = await prisma.diety.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        kana: true,
        description: true,
        registered_at: true,
        shrine_dieties: {
          select: {
            shrine: {
              select: { id: true, name: true, kana: true }
            }
          }
        }
      }
    });

    const countData = await prisma.dietyPrayStats.aggregate({
      where: { diety_id: id },
      _sum: { count: true }
    });
    const totalCount = countData._sum.count || 0;

    if (!diety) {
      return res.status(404).json({ error: 'Not found' });
    }

    const formatted = {
      ...diety,
      count: totalCount,
      registeredAt: diety.registered_at,
      shrines: diety.shrine_dieties.map(sd => sd.shrine)
    };

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching diety:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      select: {
        message: true,
        type: true,
        time: true
      },
      orderBy: {
        time: 'desc'
      },
      take: 50
    });
    
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// JWT認証ミドルウェア（開発用：一時的に無効化）
function authenticateJWT(req, res, next) {
  // 開発環境では認証をスキップ（NODE_ENVが未設定の場合も開発環境として扱う）
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    // フロントエンドから送信されたユーザーIDを使用、またはデフォルト値
    const userIdFromHeader = req.headers['x-user-id'];
    const userId = userIdFromHeader ? parseInt(userIdFromHeader, 10) : 3;
    req.user = { id: userId };
    console.log('開発環境: 認証バイパス、ユーザーID:', req.user.id);
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// 全ユーザー取得API
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        exp: true,
        ability_points: true
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ユーザーごとの「よく参拝する神社」ランキング
app.get('/users/:id/shrine-rankings', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const period = req.query.period || 'all';
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    let stats;
    switch (period) {
      case 'yearly':
        stats = await prisma.shrinePrayStatsYearly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'monthly':
        stats = await prisma.shrinePrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'weekly':
        stats = await prisma.shrinePrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      default:
        stats = await prisma.shrinePrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
    }
    const result = stats.map((s, i) => ({
      id: s.shrine.id,
      name: s.shrine.name,
      count: s.count,
      rank: i + 1
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user shrine rankings:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ユーザーごとの神様参拝ランキング一括取得API
app.get('/users/:id/diety-rankings-bundle', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  const periods = ['all', 'yearly', 'monthly', 'weekly'];
  const result = {};
  for (const period of periods) {
    let model;
    switch (period) {
      case 'yearly':
        model = prisma.dietyPrayStatsYearly;
        break;
      case 'monthly':
        model = prisma.dietyPrayStatsMonthly;
        break;
      case 'weekly':
        model = prisma.dietyPrayStatsWeekly;
        break;
      default:
        model = prisma.dietyPrayStats;
    }
    const stats = await model.findMany({
      where: { user_id: userId },
      orderBy: { count: 'desc' },
      include: { diety: { select: { id: true, name: true } } },
      take: 10,
    });
    result[period] = stats.map((s, i) => ({
      id: s.diety.id,
      name: s.diety.name,
      count: s.count,
      rank: i + 1
    }));
  }
  res.json(result);
});

app.get('/users/me/subscription', authenticateJWT, async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const subscription = await getUserSubscription(userId);
    res.json({ slots: subscription.slots });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// 課金ランク変更API（Stripe秒割り対応）
app.post('/users/me/subscription/change-plan', authenticateJWT, async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const { newSlots, stripeSubscriptionId } = req.body;
    
    if (newSlots === undefined) {
      return res.status(400).json({ error: 'newSlots is required' });
    }
    
    const slots = newSlots;
    
    // 現在のアクティブなサブスクリプションを取得
    const currentSubscription = await prisma.userSubscription.findFirst({
      where: { 
        user_id: userId,
        is_active: true,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' }
    });
    
    const now = new Date();
    
    if (currentSubscription) {
      // 現在のサブスクリプションを非アクティブ化
      await prisma.userSubscription.update({
        where: { id: currentSubscription.id },
        data: { is_active: false }
      });
      
      // 秒割り計算用の新しいサブスクリプションを作成
      const newExpiresAt = currentSubscription.expires_at;
      const billingCycleStart = currentSubscription.billing_cycle_start || currentSubscription.created_at;
      const billingCycleEnd = currentSubscription.billing_cycle_end || currentSubscription.expires_at;
      
      await prisma.userSubscription.create({
        data: {
          user_id: userId,
          slots: slots,
          expires_at: newExpiresAt,
          stripe_subscription_id: stripeSubscriptionId,
          billing_cycle_start: billingCycleStart,
          billing_cycle_end: billingCycleEnd,
          is_active: true
        }
      });
    } else {
      // 初回サブスクリプション
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await prisma.userSubscription.create({
        data: {
          user_id: userId,
          slots: slots,
          expires_at: oneMonthLater,
          stripe_subscription_id: stripeSubscriptionId,
          billing_cycle_start: now,
          billing_cycle_end: oneMonthLater,
          is_active: true
        }
      });
    }
    
    res.json({ success: true, slots: slots });
  } catch (err) {
    console.error('Subscription change error:', err);
    res.status(500).json({ error: 'Subscription change failed' });
  }
});

// Stripe Checkoutセッション作成API
app.post('/subscription/create-checkout-session', authenticateJWT, async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const { planId, platform } = req.body;
    
    // プラン定義（slots数値のみ）
    const plans = {
      'slots-1': { price: 200, slots: 1 },
      'slots-2': { price: 400, slots: 2 },
      'slots-3': { price: 600, slots: 3 },
      'slots-4': { price: 800, slots: 4 }
    };
    
    const plan = plans[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Stripe Checkoutセッション作成（実際の実装ではStripe SDKが必要）
    const sessionData = {
      planId,
      userId,
      platform,
      price: plan.price,
      slots: plan.slots,
      // 実際のStripe実装では以下を使用
      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      //   mode: 'subscription',
      //   success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      //   cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      //   metadata: { userId, planId }
      // });
    };
    
    // 仮のセッションID（実際はStripeから取得）
    const sessionId = `cs_${Date.now()}_${userId}_${planId}`;
    
    res.json({ sessionId, ...sessionData });
  } catch (err) {
    console.error('Checkout session creation error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ユーザーごとの神社・神様ランキング一括取得API
app.get('/users/:id/rankings', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const period = req.query.period || 'all';
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    // 神社ランキング
    let shrineStats;
    switch (period) {
      case 'yearly':
        shrineStats = await prisma.shrinePrayStatsYearly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'monthly':
        shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'weekly':
        shrineStats = await prisma.shrinePrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      default:
        shrineStats = await prisma.shrinePrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 10,
        });
    }
    const shrineRankings = shrineStats.map((s, i) => ({
      id: s.shrine.id,
      name: s.shrine.name,
      count: s.count,
      rank: i + 1
    }));

    // 神様ランキング
    let dietyStats;
    switch (period) {
      case 'yearly':
        dietyStats = await prisma.dietyPrayStatsYearly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'monthly':
        dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'weekly':
        dietyStats = await prisma.dietyPrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      default:
        dietyStats = await prisma.dietyPrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
    }
    const dietyRankings = dietyStats.map((d, i) => ({
      id: d.diety.id,
      name: d.diety.name,
      count: d.count,
      rank: i + 1
    }));

    res.json({ shrineRankings, dietyRankings });
  } catch (err) {
    console.error('Error fetching user rankings:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ランキング一括取得API
app.get('/shrine-rankings-bundle', async (req, res) => {
  const periods = ['all', 'yearly', 'monthly', 'weekly'];
  const result = {};
  for (const period of periods) {
    const rankings = await getShrineRankings(period); // 既存のランキング取得ロジックを流用
    result[period] = rankings;
  }
  res.json(result);
});

app.get('/diety-rankings-bundle', async (req, res) => {
  const periods = ['all', 'yearly', 'monthly', 'weekly'];
  const dietyId = parseInt(req.query.dietyId, 10);
  if (isNaN(dietyId) || dietyId <= 0) {
    return res.status(400).json({ error: 'Invalid diety ID' });
  }
  const result = {};
  for (const period of periods) {
    const rankings = await getDietyRankings(period, dietyId);
    result[period] = rankings;
  }
  res.json(result);
});

app.get('/user-rankings-bundle', async (req, res) => {
  const periods = ['all', 'yearly', 'monthly', 'weekly'];
  const result = {};
  for (const period of periods) {
    const rankings = await getUserRankings(period);
    result[period] = rankings;
  }
  res.json(result);
});

// periodごとの神社ランキング取得
async function getShrineRankings(period) {
  let stats;
  switch (period) {
    case 'yearly':
      stats = await prisma.shrinePrayStatsYearly.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 10,
      });
      break;
    case 'monthly':
      stats = await prisma.shrinePrayStatsMonthly.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 10,
      });
      break;
    case 'weekly':
      stats = await prisma.shrinePrayStatsWeekly.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 10,
      });
      break;
    default:
      stats = await prisma.shrinePrayStats.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 10,
      });
  }
  return stats.map((s, i) => ({
    id: s.shrine.id,
    name: s.shrine.name,
    count: s.count,
    rank: i + 1
  }));
}

// periodごとの神様ランキング取得
async function getDietyRankings(period, dietyId) {
  let model;
  switch (period) {
    case 'yearly':
      model = prisma.dietyPrayStatsYearly;
      break;
    case 'monthly':
      model = prisma.dietyPrayStatsMonthly;
      break;
    case 'weekly':
      model = prisma.dietyPrayStatsWeekly;
      break;
    default:
      model = prisma.dietyPrayStats;
  }
  const stats = await model.findMany({
    where: { diety_id: dietyId },
    orderBy: { count: 'desc' },
    include: { user: { select: { id: true, name: true } } },
    take: 10,
  });
  return stats.map((s, i) => ({
    id: s.user.id,
    name: s.user.name,
    count: s.count,
    rank: i + 1
  }));
}

// periodごとのユーザーランキング取得
async function getUserRankings(period) {
  let model;
  switch (period) {
    case 'yearly':
      model = prisma.shrinePrayStatsYearly;
      break;
    case 'monthly':
      model = prisma.shrinePrayStatsMonthly;
      break;
    case 'weekly':
      model = prisma.shrinePrayStatsWeekly;
      break;
    default:
      model = prisma.shrinePrayStats;
  }
  const stats = await model.findMany({
    orderBy: { count: 'desc' },
    include: { user: { select: { id: true, name: true } } },
    take: 10,
  });
  return stats.map((s, i) => ({
    userId: s.user.id,
    userName: s.user.name,
    count: s.count,
    rank: i + 1
  }));
}

// 神社ごとのユーザー参拝ランキング一括取得API
app.get('/shrines/:id/rankings-bundle', async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  if (isNaN(shrineId) || shrineId <= 0) {
    return res.status(400).json({ error: 'Invalid shrine ID' });
  }
  const periods = ['all', 'yearly', 'monthly', 'weekly'];
  const result = {};
  for (const period of periods) {
    let stats;
    switch (period) {
      case 'yearly':
        stats = await prisma.shrinePrayStatsYearly.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'monthly':
        stats = await prisma.shrinePrayStatsMonthly.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'weekly':
        stats = await prisma.shrinePrayStatsWeekly.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      default:
        stats = await prisma.shrinePrayStats.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 10,
        });
    }
    result[period] = stats.map((s, i) => ({
      userId: s.user.id,
      userName: s.user.name,
      count: s.count,
      rank: i + 1
    }));
  }
  res.json(result);
});

// 現在のユーザーの参拝した神社一覧
app.get('/users/me/shrines-visited', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    const stats = await prisma.shrinePrayStats.findMany({
      where: { user_id: userId },
      include: { shrine: true },
      orderBy: { count: 'desc' },
    });
    const result = stats.map(s => ({
      id: s.shrine.id,
      name: s.shrine.name,
      count: s.count,
      registeredAt: s.shrine.registered_at
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/users/:id/shrines-visited', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const stats = await prisma.shrinePrayStats.findMany({
      where: { user_id: userId },
      include: { shrine: true },
      orderBy: { count: 'desc' },
    });
    const result = stats.map(s => ({
      id: s.shrine.id,
      name: s.shrine.name,
      count: s.count,
      registeredAt: s.shrine.registered_at
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 現在のユーザーの参拝した神様一覧
app.get('/users/me/dieties-visited', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    const stats = await prisma.dietyPrayStats.findMany({
      where: { user_id: userId },
      include: { diety: true },
      orderBy: { count: 'desc' },
    });
    const result = stats.map(s => ({
      id: s.diety.id,
      name: s.diety.name,
      count: s.count,
      registeredAt: s.diety.registered_at
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user dieties:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/users/:id/dieties-visited', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const stats = await prisma.dietyPrayStats.findMany({
      where: { user_id: userId },
      include: { diety: true },
      orderBy: { count: 'desc' },
    });
    const result = stats.map(s => ({
      id: s.diety.id,
      name: s.diety.name,
      count: s.count,
      registeredAt: s.diety.registered_at
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user dieties:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/users/:id/titles', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const titles = await prisma.userTitle.findMany({
      where: { user_id: userId },
      include: { title: true },
      orderBy: { awarded_at: 'desc' },
    });
    res.json(titles.map(t => ({ id: t.title.id, name: t.title.name })));
  } catch (err) {
    console.error('Error fetching user titles:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 能力一覧取得
app.get('/abilities', async (req, res) => {
  try {
    const abilities = await prisma.abilityMaster.findMany({
      select: { 
        id: true, 
        name: true, 
        description: true,
        base_cost: true, 
        cost_increase: true,
        effect_type: true, 
        effect_value: true,
        max_level: true,
        prerequisite_ability_id: true
      }
    });
    res.json(abilities);
  } catch (err) {
    console.error('Error fetching abilities:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 能力獲得
app.post('/abilities/:id/acquire', authenticateJWT, async (req, res) => {
  const abilityId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  
  console.log('能力獲得リクエスト:', { abilityId, userId });
  
  if (isNaN(abilityId) || abilityId <= 0) {
    console.log('無効な能力ID:', abilityId);
    return res.status(400).json({ error: 'Invalid ability ID' });
  }
  
  try {
    const ability = await prisma.abilityMaster.findUnique({ 
      where: { id: abilityId },
      include: { prerequisite_ability: true }
    });
    if (!ability) {
      console.log('能力が見つかりません:', abilityId);
      return res.status(404).json({ error: 'Ability not found' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('ユーザーが見つかりません:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 前提能力のチェック
    if (ability.prerequisite_ability_id) {
      const prerequisite = await prisma.userAbility.findUnique({
        where: { user_id_ability_id: { user_id: userId, ability_id: ability.prerequisite_ability_id } }
      });
      if (!prerequisite) {
        console.log('前提能力が未獲得:', { userId, prerequisiteAbilityId: ability.prerequisite_ability_id });
        return res.status(400).json({ error: 'Prerequisite ability not acquired' });
      }
    }
    
    // 既に獲得済みかチェック
    const existing = await prisma.userAbility.findUnique({
      where: { user_id_ability_id: { user_id: userId, ability_id: abilityId } }
    });
    
    if (existing) {
      console.log('既に獲得済みの能力:', { userId, abilityId });
      return res.status(400).json({ error: 'Ability already acquired' });
    }
    
    console.log('能力情報:', { 
      userId: user.id, 
      abilityPoints: user.ability_points, 
      abilityCost: ability.cost
    });
    
    if (user.ability_points < ability.cost) {
      console.log('能力ポイント不足:', { current: user.ability_points, required: ability.cost });
      return res.status(400).json({ error: 'Insufficient ability points' });
    }
    
    console.log('能力獲得処理開始');
    
    // 新しい能力を獲得
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { ability_points: { decrement: ability.cost } }
      });
      await tx.userAbility.create({
        data: { user_id: userId, ability_id: abilityId }
      });
      await tx.abilityLog.create({
        data: {
          user_id: userId,
          ability_id: abilityId,
          points_spent: ability.cost
        }
      });
    });
    
    console.log('能力獲得成功');
    res.json({ success: true, cost: ability.cost });
  } catch (err) {
    console.error('能力獲得エラー:', err);
    res.status(500).json({ error: 'DB error', details: err.message });
  }
});

// 能力初期化（有料リセット）
app.post('/user/reset-abilities', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // リセット権限のチェック
    const resetSubscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        subscription_type: 'reset_abilities',
        is_active: true,
        expires_at: { gt: new Date() }
      }
    });

    if (!resetSubscription) {
      return res.status(400).json({ error: '能力初期化には有料サブスクリプションが必要です。' });
    }

    const abilities = await prisma.userAbility.findMany({
      where: { user_id: userId },
      include: { ability: true }
    });

    // 獲得した能力ポイントの合計を計算
    const total = abilities.reduce((sum, ua) => {
      return sum + ua.ability.cost;
    }, 0);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { ability_points: { increment: total } }
      });
      await tx.userAbility.deleteMany({ where: { user_id: userId } });
      await tx.abilityLog.createMany({
        data: abilities.map((ua) => ({
          user_id: userId,
          ability_id: ua.ability_id,
          points_spent: -total // 全額払い戻し
        }))
      });
      // リセット権限を消費
      await tx.userSubscription.update({
        where: { id: resetSubscription.id },
        data: { is_active: false }
      });
    });

    res.json({ success: true, refundedPoints: total });
  } catch (err) {
    console.error('Error resetting abilities:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 新しいレベルシステムAPI

// ユーザーのレベル情報取得
app.get('/users/:id/level-info', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, level: true, exp: true, ability_points: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentLevelMaster = await prisma.levelMaster.findUnique({
      where: { level: user.level }
    });

    const nextLevelMaster = await prisma.levelMaster.findUnique({
      where: { level: user.level + 1 }
    });

    const prayDistance = await getUserPrayDistance(userId);
    const worshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        level: user.level,
        exp: user.exp,
        ability_points: user.ability_points
      },
      level: {
        current: currentLevelMaster,
        next: nextLevelMaster,
        progress: nextLevelMaster ? 
          Math.min(100, Math.floor((user.exp - currentLevelMaster.required_exp) / (nextLevelMaster.required_exp - currentLevelMaster.required_exp) * 100)) : 
          100
      },
      stats: {
        pray_distance: prayDistance,
        worship_count: worshipCount,
        today_worship_count: todayWorshipCount
      }
    });
  } catch (err) {
    console.error('Error fetching user level info:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ユーザーの能力一覧取得
app.get('/users/:id/abilities', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const userAbilities = await prisma.userAbility.findMany({
      where: { user_id: userId },
      include: { ability: true },
      orderBy: { acquired_at: 'desc' }
    });

    const allAbilities = await prisma.abilityMaster.findMany({
      include: { prerequisite_ability: true },
      orderBy: { id: 'asc' }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ability_points: true }
    });

    const userAbilityMap = new Map(userAbilities.map(ua => [ua.ability_id, ua]));

    const abilities = allAbilities.map(ability => {
      const userAbility = userAbilityMap.get(ability.id);
      const purchased = !!userAbility;
      const nextCost = ability.cost;
      // 前提能力のチェック
      let prerequisiteMet = true;
      if (ability.prerequisite_ability_id) {
        const prerequisite = userAbilityMap.get(ability.prerequisite_ability_id);
        prerequisiteMet = !!prerequisite;
      }
      return {
        id: ability.id,
        name: ability.name,
        description: ability.description,
        cost: ability.cost,
        effect_type: ability.effect_type,
        effect_value: ability.effect_value,
        prerequisite_ability_id: ability.prerequisite_ability_id,
        prerequisite_ability: ability.prerequisite_ability,
        purchased,
        can_purchase: user.ability_points >= nextCost && prerequisiteMet && !purchased,
      };
    });

    res.json({
      abilities,
      ability_points: user.ability_points
    });
  } catch (err) {
    console.error('Error fetching user abilities:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 能力購入API（新しい実装）
app.post('/abilities/:id/purchase', authenticateJWT, async (req, res) => {
  const abilityId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  
  if (isNaN(abilityId) || abilityId <= 0) {
    return res.status(400).json({ error: 'Invalid ability ID' });
  }

  try {
    const result = await purchaseAbility(userId, abilityId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    // 更新されたユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ability_points: true }
    });

    res.json({ 
      success: true, 
      ability_points: user.ability_points 
    });
  } catch (err) {
    console.error('Error purchasing ability:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 遥拝回数制限チェックAPI
app.get('/users/:id/worship-limit', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const maxWorshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);
    
    res.json({
      max_worship_count: maxWorshipCount,
      today_worship_count: todayWorshipCount,
      remaining_worship_count: Math.max(0, maxWorshipCount - todayWorshipCount),
      can_worship: todayWorshipCount < maxWorshipCount
    });
  } catch (err) {
    console.error('Error fetching worship limit:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 参拝距離取得API
app.get('/users/:id/pray-distance', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const prayDistance = await getUserPrayDistance(userId);
    
    res.json({
      pray_distance: prayDistance
    });
  } catch (err) {
    console.error('Error fetching pray distance:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// サブスクリプション取得API（ユーザーID指定）
app.get('/users/:id/subscription', authenticateJWT, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    // JWTのuser.idと一致しない場合は403
    if (req.user && req.user.id && req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// 既存のユーザー系APIにも認証を適用（例: /users/:id, /users/:id/abilities など）
app.get('/users/:id', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const viewerId = req.query.viewerId ? parseInt(req.query.viewerId, 10) : null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, level: true, exp: true, ability_points: true },
    });
    if (!user) return res.status(404).json({ error: 'Not found' });

    const followingCount = await prisma.follow.count({ where: { follower_id: userId } });
    const followerCount = await prisma.follow.count({ where: { following_id: userId } });

    const shrineStats = await prisma.shrinePrayStats.findMany({
      where: { user_id: userId },
      orderBy: { count: 'desc' },
      include: { shrine: { select: { id: true, name: true } } },
      take: 5,
    });
    const dietyStats = await prisma.dietyPrayStats.findMany({
      where: { user_id: userId },
      orderBy: { count: 'desc' },
      include: { diety: { select: { id: true, name: true } } },
      take: 5,
    });

    let isFollowing = false;
    if (viewerId) {
      const rel = await prisma.follow.findUnique({
        where: {
          follower_id_following_id: { follower_id: viewerId, following_id: userId },
        },
      });
      isFollowing = !!rel;
    }

    // 追加: 各種カウント・距離を取得
    const prayDistance = await getUserPrayDistance(userId);
    const worshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);

    res.json({
      id: user.id,
      name: user.name,
      level: user.level,
      exp: user.exp,
      ability_points: user.ability_points,
      pray_distance: prayDistance,
      worship_count: worshipCount,
      today_worship_count: todayWorshipCount,
      following_count: followingCount,
      follower_count: followerCount,
      is_following: isFollowing,
      // 必要に応じて他のプロパティも追加
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'DB error' });
  }
});
// フォロー一覧取得
app.get('/users/:id/following', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const following = await prisma.follow.findMany({
      where: { follower_id: userId },
      include: {
        following: {
          select: { id: true, name: true }
        }
      }
    });
    
    const result = following.map(f => ({
      id: f.following.id,
      name: f.following.name
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching following:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// フォロワー一覧取得
app.get('/users/:id/followers', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const followers = await prisma.follow.findMany({
      where: { following_id: userId },
      include: {
        follower: {
          select: { id: true, name: true }
        }
      }
    });
    
    const result = followers.map(f => ({
      id: f.follower.id,
      name: f.follower.name
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// フォロー/アンフォロー
app.post('/follows', authenticateJWT, async (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // 自分自身をフォローできないようにする
  if (followerId === followingId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  try {
    // 既存のフォロー関係をチェック
    const existingFollow = await prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId
        }
      }
    });
    
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }
    
    await prisma.follow.create({
      data: {
        follower_id: followerId,
        following_id: followingId
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating follow:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/follows', authenticateJWT, async (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await prisma.follow.delete({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId
        }
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting follow:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/users/:id/abilities', authenticateJWT, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const userAbilities = await prisma.userAbility.findMany({
      where: { user_id: userId },
      include: { ability: true },
      orderBy: { acquired_at: 'desc' }
    });

    const allAbilities = await prisma.abilityMaster.findMany({
      orderBy: { id: 'asc' }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ability_points: true }
    });

    const purchasedAbilityIds = new Set(userAbilities.map(ua => ua.ability_id));

    const abilities = allAbilities.map(ability => ({
      id: ability.id,
      name: ability.name,
      cost: ability.cost,
      effect_type: ability.effect_type,
      effect_value: ability.effect_value,
      purchased: purchasedAbilityIds.has(ability.id),
      can_purchase: user.ability_points >= ability.cost && !purchasedAbilityIds.has(ability.id)
    }));

    res.json({
      abilities,
      ability_points: user.ability_points
    });
  } catch (err) {
    console.error('Error fetching user abilities:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    addLog('システム: サーバーを起動しました', 'system');
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Stripeで能力初期化用Checkoutセッション作成API
app.post('/subscription/reset-abilities/checkout', authenticateJWT, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe機能が無効です。STRIPE_SECRET_KEYを設定してください。' });
  }
  
  try {
    const userId = req.user.id;
    // Stripe Price IDは.envから取得
    const priceId = process.env.STRIPE_RESET_ABILITIES_PRICE_ID;
    if (!priceId) return res.status(500).json({ error: 'Stripe Price ID未設定' });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: { userId, type: 'reset_abilities' }
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout作成エラー:', err);
    res.status(500).json({ error: 'Stripe Checkout作成エラー' });
  }
});

// Stripe Webhook受信API
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe機能が無効です。STRIPE_SECRET_KEYを設定してください。' });
  }
  
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook署名検証失敗:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // 支払い完了イベント
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.metadata && session.metadata.type === 'reset_abilities') {
      const userId = parseInt(session.metadata.userId, 10);
      if (userId) {
        // サブスクリプション付与
        const now = new Date();
        const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await prisma.userSubscription.create({
          data: {
            user_id: userId,
            subscription_type: 'reset_abilities',
            expires_at: oneMonthLater,
            is_active: true,
            billing_cycle_start: now,
            billing_cycle_end: oneMonthLater
          }
        });
        console.log(`reset_abilitiesサブスクリプション付与: userId=${userId}`);
      }
    }
  }
  res.json({ received: true });
});

// 神社マーカーの状態を取得するAPI
app.get('/shrines/:id/marker-status', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const userId = parseInt(req.headers['x-user-id']) || 1;
  
  if (isNaN(shrineId) || shrineId <= 0) {
    return res.status(400).json({ error: 'Invalid shrine ID' });
  }
  
  try {
    // 1. 合計参拝回数（図鑑収録済みかどうか）
    const shrineStats = await prisma.shrinePrayStats.findFirst({
      where: { shrine_id: shrineId, user_id: userId }
    });
    const totalPrayCount = shrineStats ? shrineStats.count : 0;
    const isInZukan = totalPrayCount > 0;
    
    // 2. 当日参拝回数（遥拝可能かどうか）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayRemotePrayCount = await prisma.remotePray.count({
      where: {
        user_id: userId,
        shrine_id: shrineId,
        prayed_at: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // 3. 遥拝回数制限
    const maxWorshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);
    const canRemotePray = todayWorshipCount < maxWorshipCount && todayRemotePrayCount === 0;
    
    // 4. 参拝可能距離
    const prayDistance = await getUserPrayDistance(userId);
    
    res.json({
      shrine_id: shrineId,
      total_pray_count: totalPrayCount,
      is_in_zukan: isInZukan,
      today_remote_pray_count: todayRemotePrayCount,
      can_remote_pray: canRemotePray,
      pray_distance: prayDistance,
      max_worship_count: maxWorshipCount,
      today_worship_count: todayWorshipCount
    });
  } catch (err) {
    console.error('Error fetching shrine marker status:', err);
    res.status(500).json({ error: 'DB error' });
  }
});
