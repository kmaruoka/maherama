require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
import { LEVEL_SYSTEM } from './shared/constants/levelSystem';
import { addExperience } from './shared/utils/expSystem';
import { EXP_REWARDS } from './shared/constants/expRewards';

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
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

let lastRemotePray = null;
const REMOTE_INTERVAL_DAYS = 7;





// ユーザーの現在の参拝距離を取得
async function getUserPrayDistance(userId: number) {
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
  const additionalDistance = rangeAbilities.reduce((sum: number, userAbility: any) => {
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
  
  // --- 調査用ログ出力 ---
  // console.log('[調査] getUserPrayDistance:', {
  //   userId,
  //   userLevel: user.level,
  //   baseDistance,
  //   additionalDistance,
  //   activeSubscription: !!activeSubscription,
  //   totalDistance,
  //   returnValue: activeSubscription ? totalDistance * 2 : totalDistance
  // });
  // ---

  if (activeSubscription) {
    return totalDistance * 2;
  }

  return totalDistance;
}

// ユーザーの1日の遥拝回数を取得
async function getUserWorshipCount(userId: number) {
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

  const additionalCount = worshipAbilities.reduce((sum: number, userAbility: any) => {
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
async function getTodayWorshipCount(userId: number) {
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

// 古い経験値システムは削除（shared/utils/expSystem.tsに統一）

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
        image_id: true,
        image_url: true,
        image_url64: true,
        image_url128: true,
        image_url256: true,
        image_url512: true,
        image_by: true,
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
        image_id: true,
        image_url: true,
        image_url64: true,
        image_url128: true,
        image_url256: true,
        image_url512: true,
        image_by: true,
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
      return res.status(404).json({ error: 'Shrine not found' });
    }

    const result = {
      ...shrine,
      count: totalCount,
      registeredAt: shrine.registered_at,
      dieties: (shrine.shrine_dieties || []).map(sd => sd.diety)
    };
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 共通化: 参拝・遥拝の業務ロジック
async function prayAtShrine({
  prisma,
  shrineId,
  userId,
  logType = '参拝', // '参拝' or '遥拝'
}) {
  // 神社・祭神情報取得
  const shrine = await prisma.shrine.findUnique({
    where: { id: shrineId },
    select: {
      name: true,
      shrine_dieties: {
        select: {
          diety: { select: { id: true, name: true } }
        }
      }
    }
  });
  if (!shrine) {
    throw new Error('Not found');
  }

  // 参拝/遥拝記録
  if (logType === '参拝') {
    await prisma.shrinePray.create({ data: { shrine_id: shrineId, user_id: userId } });
  } else {
    await prisma.remotePray.create({ data: { shrine_id: shrineId, user_id: userId, prayed_at: new Date() } });
  }

  // ShrineCatalog更新
  const shrineCatalogResult = await prisma.shrineCatalog.upsert({
    where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } },
    update: { last_prayed_at: new Date() },
    create: { user_id: userId, shrine_id: shrineId, last_prayed_at: new Date() }
  });

  // ShrinePrayStats系
  const statsTables = [
    { model: prisma.shrinePrayStats, key: 'shrinePrayStats' },
    { model: prisma.shrinePrayStatsYearly, key: 'shrinePrayStatsYearly' },
    { model: prisma.shrinePrayStatsMonthly, key: 'shrinePrayStatsMonthly' },
    { model: prisma.shrinePrayStatsWeekly, key: 'shrinePrayStatsWeekly' },
    { model: prisma.shrinePrayStatsDaily, key: 'shrinePrayStatsDaily' },
  ];
  for (const tbl of statsTables) {
    const stat = await tbl.model.findFirst({ where: { shrine_id: shrineId, user_id: userId } });
    if (stat) {
      await tbl.model.update({ where: { id: stat.id }, data: { count: stat.count + 1 } });
    } else {
      await tbl.model.create({ data: { shrine_id: shrineId, user_id: userId, count: 1, rank: 1 } });
    }
  }

  // 神様カウント・DietyCatalog
  for (const sd of shrine.shrine_dieties) {
    await prisma.dietyPray.create({ data: { diety_id: sd.diety.id, user_id: userId } });
    const dietyId = sd.diety.id;
    const dietyStatsTables = [
      { model: prisma.dietyPrayStats, key: 'dietyPrayStats' },
      { model: prisma.dietyPrayStatsYearly, key: 'dietyPrayStatsYearly' },
      { model: prisma.dietyPrayStatsMonthly, key: 'dietyPrayStatsMonthly' },
      { model: prisma.dietyPrayStatsWeekly, key: 'dietyPrayStatsWeekly' },
      { model: prisma.dietyPrayStatsDaily, key: 'dietyPrayStatsDaily' },
    ];
    for (const tbl of dietyStatsTables) {
      const stat = await tbl.model.findFirst({ where: { diety_id: dietyId, user_id: userId } });
      if (stat) {
        await tbl.model.update({ where: { id: stat.id }, data: { count: stat.count + 1 } });
      } else {
        await tbl.model.create({ data: { diety_id: dietyId, user_id: userId, count: 1, rank: 1 } });
      }
    }
    await prisma.dietyCatalog.upsert({
      where: { user_id_diety_id: { user_id: userId, diety_id: dietyId } },
      update: { last_prayed_at: new Date() },
      create: { user_id: userId, diety_id: dietyId, last_prayed_at: new Date() }
    });
  }

  // 総参拝数
  const totalCount = await prisma.shrinePrayStats.aggregate({
    where: { shrine_id: shrineId },
    _sum: { count: true }
  });

  // 経験値
  const expType = logType === '参拝' ? 'PRAY' : 'REMOTE_PRAY';
  const expReward = logType === '参拝' ? EXP_REWARDS.PRAY : EXP_REWARDS.REMOTE_PRAY;
  const expResult = await addExperience(prisma, userId, expReward, expType);

  // ログ（神社と神様の両方をリンク表示）
  const dietyLinks = shrine.shrine_dieties.map(sd => `<diety:${sd.diety.id}:${sd.diety.name}>`);
  const dietyLinksText = dietyLinks.length > 0 ? `(${dietyLinks.join('、')})` : '';
  await addLog(`<shrine:${shrineId}:${shrine.name}>${dietyLinksText}を${logType}しました`);

  return {
    success: true,
    count: totalCount._sum.count || 0,
    level_up: expResult.levelUp,
    new_level: expResult.newLevel,
    ability_points_gained: expResult.abilityPointsGained
  };
}

// 参拝API
app.post('/shrines/:id/pray', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.headers['x-user-id']) || 1;
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid shrine ID' });
  }
  if (!userId || isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid or missing x-user-id header' });
  }
  // 距離チェック
  const shrine = await prisma.shrine.findUnique({ where: { id }, select: { lat: true, lng: true } });
  if (!shrine) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.body.lat == null || req.body.lng == null) {
    return res.status(400).json({ error: '緯度・経度がリクエストボディに含まれていません' });
  }
  const toRad = (x) => x * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(req.body.lat - shrine.lat);
  const dLng = toRad(req.body.lng - shrine.lng);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(shrine.lat)) * Math.cos(toRad(req.body.lat)) * Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const dist = R * c;
  const prayDistance = await getUserPrayDistance(userId);
  if (dist > prayDistance) {
    return res.status(400).json({ error: '現在地が神社から離れすぎています', dist, radius: prayDistance });
  }
  
  // 参拝制限チェック: 1ユーザー1日1神社につき1回のみ
  // ShrinePrayStatsDailyテーブルで判定（データ量最適化のため）
  const todaysPrayStats = await prisma.shrinePrayStatsDaily.findUnique({
    where: {
      shrine_id_user_id: {
        shrine_id: id,
        user_id: userId
      }
    }
  });
  
  if (todaysPrayStats && todaysPrayStats.count > 0) {
    return res.status(400).json({ error: 'この神社は今日既に参拝済みです' });
  }
  
  try {
    const result = await prayAtShrine({
      prisma,
      shrineId: id,
      userId,
      logType: '参拝',
    });
    res.json(result);
  } catch (err) {
    console.error('Error praying at shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 遥拝API
app.post('/shrines/:id/remote-pray', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.headers['x-user-id']) || 1;
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid shrine ID' });
  }
  if (!userId || isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid or missing x-user-id header' });
  }
  // 遥拝回数チェック
  const maxWorshipCount = await getUserWorshipCount(userId);
  const todayWorshipCount = await getTodayWorshipCount(userId);
  if (todayWorshipCount >= maxWorshipCount) {
    return res.status(400).json({ error: `遥拝は1日に${maxWorshipCount}回までです（今日の使用回数: ${todayWorshipCount}回）` });
  }
  try {
    const result = await prayAtShrine({
      prisma,
      shrineId: id,
      userId,
      logType: '遥拝',
    });
    res.json(result);
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
  //console.log('Diety ID parameter:', req.params.id, 'Parsed ID:', id);
  
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
        image_id: true,
        image_url: true,
        image_url64: true,
        image_url128: true,
        image_url256: true,
        image_url512: true,
        image_by: true,
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

    const result = {
      ...diety,
      count: totalCount,
      registeredAt: diety.registered_at,
      shrines: (diety.shrine_dieties || []).map(sd => sd.shrine)
    };

    res.json(result);
  } catch (err) {
    console.error('Error fetching diety:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 神様画像アップロード
app.post('/dieties/:id/images', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  if (isNaN(dietyId) || dietyId <= 0) {
    return res.status(400).json({ error: 'Invalid diety ID' });
  }
  try {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data' });
    const Jimp = require('jimp');
    const fs = require('fs');
    const folder = `uploads/${new Date().toISOString().slice(0,7).replace('-', '')}`;
    fs.mkdirSync(folder, { recursive: true });
    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const img = await Jimp.read(buffer);
    const sizes = { marker: 64, thumb: 200, large: 800 };
    for (const [key, size] of Object.entries(sizes)) {
      const clone = img.clone().cover(size, size);
      await clone.quality(80).writeAsync(`${folder}/diety${dietyId}-u${userId}_s${key}.jpg`);
    }
    await prisma.dietyImage.create({
      data: {
        diety_id: dietyId,
        user_id: userId,
        image_url: `${folder}/diety${dietyId}-u${userId}_sthumb.jpg`,
        voting_month: new Date().toISOString().slice(0,7).replace('-', ''),
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error uploading diety image:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/dieties/:id/images', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  if (isNaN(dietyId) || dietyId <= 0) {
    return res.status(400).json({ error: 'Invalid diety ID' });
  }
  try {
    const month = new Date().toISOString().slice(0,7).replace('-', '');
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = prev.toISOString().slice(0,7).replace('-', '');
    const images = await prisma.dietyImage.findMany({
      where: { diety_id: dietyId, voting_month: { in: [month, prevMonth] } },
      include: { user: true, votes: true },
      orderBy: { uploaded_at: 'desc' }
    });
    res.json(images.map(img => ({
      id: img.id,
      imageUrl: img.image_url,
      user: { id: img.user_id, name: img.user.name },
      votes: img.votes.length,
      isWinner: img.is_winner
    })));
  } catch (err) {
    console.error('Error fetching diety images:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/diety-images/:id/vote', authenticateJWT, async (req, res) => {
  const imageId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  if (isNaN(imageId) || imageId <= 0) {
    return res.status(400).json({ error: 'Invalid image ID' });
  }
  try {
    await prisma.dietyImageVote.create({ data: { diety_image_id: imageId, user_id: userId } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Already voted' });
    }
    console.error('Error voting diety image:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      select: {
        message: true,
        type: true,
        logged_at: true
      },
      orderBy: {
        logged_at: 'desc'
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
    //console.log('開発環境: 認証バイパス、ユーザーID:', req.user.id);
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
          take: 100,
        });
        break;
      case 'monthly':
        stats = await prisma.shrinePrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      case 'weekly':
        stats = await prisma.shrinePrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      default:
        stats = await prisma.shrinePrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 100,
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
          take: 100,
        });
        break;
      case 'monthly':
        shrineStats = await prisma.shrinePrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      case 'weekly':
        shrineStats = await prisma.shrinePrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      default:
        shrineStats = await prisma.shrinePrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { shrine: { select: { id: true, name: true } } },
          take: 100,
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
          take: 100,
        });
        break;
      case 'monthly':
        dietyStats = await prisma.dietyPrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      case 'weekly':
        dietyStats = await prisma.dietyPrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      default:
        dietyStats = await prisma.dietyPrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 100,
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
        take: 100,
      });
      break;
    case 'monthly':
      stats = await prisma.shrinePrayStatsMonthly.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 100,
      });
      break;
    case 'weekly':
      stats = await prisma.shrinePrayStatsWeekly.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 100,
      });
      break;
    default:
      stats = await prisma.shrinePrayStats.findMany({
        orderBy: { count: 'desc' },
        include: { shrine: { select: { id: true, name: true } } },
        take: 100,
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
          take: 100,
        });
        break;
      case 'monthly':
        stats = await prisma.shrinePrayStatsMonthly.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      case 'weekly':
        stats = await prisma.shrinePrayStatsWeekly.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 100,
        });
        break;
      default:
        stats = await prisma.shrinePrayStats.findMany({
          where: { shrine_id: shrineId },
          orderBy: { count: 'desc' },
          include: { user: { select: { id: true, name: true } } },
          take: 100,
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
    // ShrineCatalog から last_prayed_at と cataloged_at を取得
    const catalogs = await prisma.shrineCatalog.findMany({
      where: { user_id: userId },
      select: { shrine_id: true, last_prayed_at: true, cataloged_at: true }
    });
    const lastPrayedMap = Object.fromEntries(catalogs.map(b => [b.shrine_id, b.last_prayed_at]));
    const catalogedAtMap = Object.fromEntries(catalogs.map(b => [b.shrine_id, b.cataloged_at]));
    const result = stats.map(s => ({
      id: s.shrine.id,
      name: s.shrine.name,
      kana: s.shrine.kana,
      count: s.count,
      registeredAt: catalogedAtMap[s.shrine.id] || s.shrine.registered_at, // 図鑑収録日を優先、なければ神社登録日 TODO: 図鑑収録日のみでよいはずだが？
      last_prayed_at: lastPrayedMap[s.shrine.id] || null
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
    // まずDietyPrayStatsからdiety_idとcountを取得
    const stats = await prisma.dietyPrayStats.findMany({
      where: { user_id: userId },
      select: { 
        diety_id: true, 
        count: true 
      },
      orderBy: { count: 'desc' },
    });
    if (stats.length === 0) {
      return res.json([]);
    }
    // diety_idのリストを作成
    const dietyIds = stats.map(s => s.diety_id);
    // Dietyテーブルから神様情報を取得
    const dieties = await prisma.diety.findMany({
      where: { id: { in: dietyIds } },
      select: { 
        id: true, 
        name: true, 
        kana: true, 
        registered_at: true 
      }
    });
    // 各神様のサムネイルを取得
    const thumbnails = await prisma.dietyImage.findMany({
      where: { diety_id: { in: dietyIds }, is_current_thumbnail: true },
      select: { diety_id: true, thumbnail_url: true }
    });
    // DietyCatalog から last_prayed_at と cataloged_at を取得
    const catalogs = await prisma.dietyCatalog.findMany({
      where: { user_id: userId },
      select: { diety_id: true, last_prayed_at: true, cataloged_at: true }
    });
    const thumbMap = Object.fromEntries(thumbnails.map(t => [t.diety_id, t.thumbnail_url]));
    const dietyMap = Object.fromEntries(dieties.map(d => [d.id, d]));
    const lastPrayedMap = Object.fromEntries(catalogs.map(b => [b.diety_id, b.last_prayed_at]));
    const catalogedAtMap = Object.fromEntries(catalogs.map(b => [b.diety_id, b.cataloged_at]));
    const result = stats.map(s => {
      const diety = dietyMap[s.diety_id];
      if (!diety) return null;
      return {
        id: diety.id,
        name: diety.name,
        kana: diety.kana,
        count: s.count,
        registeredAt: catalogedAtMap[diety.id] || diety.registered_at, // 図鑑収録日を優先、なければ神様登録日 TODO: 図鑑収録日のみでよいはずだが？
        image_url: thumbMap[diety.id] || null,
        last_prayed_at: lastPrayedMap[diety.id] || null
      };
    }).filter(Boolean);
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
    // まずDietyPrayStatsからdiety_idとcountを取得
    const stats = await prisma.dietyPrayStats.findMany({
      where: { user_id: userId },
      select: { 
        diety_id: true, 
        count: true 
      },
      orderBy: { count: 'desc' },
    });
    
    if (stats.length === 0) {
      return res.json([]);
    }
    
    // diety_idのリストを作成
    const dietyIds = stats.map(s => s.diety_id);
    
    // Dietyテーブルから神様情報を取得
    const dieties = await prisma.diety.findMany({
      where: { id: { in: dietyIds } },
      select: { 
        id: true, 
        name: true, 
        kana: true, 
        registered_at: true 
      }
    });
    
    const dietyMap = Object.fromEntries(dieties.map(d => [d.id, d]));
    
    const result = stats.map(s => {
      const diety = dietyMap[s.diety_id];
      if (!diety) return null;
      
      return {
        id: diety.id,
        name: diety.name,
        kana: diety.kana,
        count: s.count,
        registeredAt: diety.registered_at
      };
    }).filter(Boolean);
    
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
    // name_templateとembed_dataを合成
    const result = titles.map(t => {
      let name = t.title.name_template;
      if (t.embed_data && typeof t.embed_data === 'object') {
        for (const key of Object.keys(t.embed_data)) {
          name = name.replace(new RegExp(`<\{${key}\}>`, 'g'), t.embed_data[key]);
        }
      }
      return {
        id: t.id,
        name,
        template: t.title.name_template,
        embed_data: t.embed_data,
        grade: t.grade,
        display_name: t.display_name || name
      };
    });
    res.json(result);
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
  
  //console.log('能力獲得リクエスト:', { abilityId, userId });
  
  if (isNaN(abilityId) || abilityId <= 0) {
    console.error('無効な能力ID:', abilityId);
    return res.status(400).json({ error: 'Invalid ability ID' });
  }
  
  try {
    const ability = await prisma.abilityMaster.findUnique({ 
      where: { id: abilityId },
      include: { prerequisite_ability: true }
    });
    if (!ability) {
      console.error('能力が見つかりません:', abilityId);
      return res.status(404).json({ error: 'Ability not found' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error('ユーザーが見つかりません:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 前提能力のチェック
    if (ability.prerequisite_ability_id) {
      const prerequisite = await prisma.userAbility.findUnique({
        where: { user_id_ability_id: { user_id: userId, ability_id: ability.prerequisite_ability_id } }
      });
      if (!prerequisite) {
        console.error('前提能力が未獲得:', { userId, prerequisiteAbilityId: ability.prerequisite_ability_id });
        return res.status(400).json({ error: 'Prerequisite ability not acquired' });
      }
    }
    
    // 既に獲得済みかチェック
    const existing = await prisma.userAbility.findUnique({
      where: { user_id_ability_id: { user_id: userId, ability_id: abilityId } }
    });
    
    if (existing) {
      console.error('既に獲得済みの能力:', { userId, abilityId });
      return res.status(400).json({ error: 'Ability already acquired' });
    }
    
    // console.log('能力情報:', { 
    //   userId: user.id, 
    //   abilityPoints: user.ability_points, 
    //   abilityCost: ability.cost
    // });
    
    if (user.ability_points < ability.cost) {
      console.error('能力ポイント不足:', { current: user.ability_points, required: ability.cost });
      return res.status(400).json({ error: 'Insufficient ability points' });
    }
    
    //console.log('能力獲得処理開始');
    
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
    
    //console.log('能力獲得成功');
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
      select: { 
        id: true, 
        name: true, 
        level: true, 
        exp: true, 
        ability_points: true,
        image_id: true,
        image_url: true,
        image_url64: true,
        image_url128: true,
        image_url256: true,
        image_url512: true,
        image_by: true
      },
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
      image_id: user.image_id,
      image_url: user.image_url,
      image_url64: user.image_url64,
      image_url128: user.image_url128,
      image_url256: user.image_url256,
      image_url512: user.image_url512,
      image_by: user.image_by,
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
          select: { 
            id: true, 
            name: true,
            image_id: true,
            image_url: true,
            image_url64: true,
            image_url128: true,
            image_url256: true,
            image_url512: true,
            image_by: true
          }
        }
      }
    });
    
    const result = following.map(f => ({
      id: f.following.id,
      name: f.following.name,
      image_id: f.following.image_id,
      image_url: f.following.image_url,
      image_url64: f.following.image_url64,
      image_url128: f.following.image_url128,
      image_url256: f.following.image_url256,
      image_url512: f.following.image_url512,
      image_by: f.following.image_by
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
          select: { 
            id: true, 
            name: true,
            image_id: true,
            image_url: true,
            image_url64: true,
            image_url128: true,
            image_url256: true,
            image_url512: true,
            image_by: true
          }
        }
      }
    });
    
    const result = followers.map(f => ({
      id: f.follower.id,
      name: f.follower.name,
      image_id: f.follower.image_id,
      image_url: f.follower.image_url,
      image_url64: f.follower.image_url64,
      image_url128: f.follower.image_url128,
      image_url256: f.follower.image_url256,
      image_url512: f.follower.image_url512,
      image_by: f.follower.image_by
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
    console.log(`Server is running on port ${port}`);
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
    // 1. 図鑑収録済みかどうか（ShrineCatalogテーブルで判定）
    const shrineCatalog = await prisma.shrineCatalog.findUnique({
      where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } }
    });
    const isInZukan = !!shrineCatalog;
    
    // 2. 合計参拝回数
    const shrineStats = await prisma.shrinePrayStats.findFirst({
      where: { shrine_id: shrineId, user_id: userId }
    });
    const totalPrayCount = shrineStats ? shrineStats.count : 0;
    
    // 2. 今日の参拝済み判定（ShrinePrayStatsDailyで判定）
    const todayPrayStats = await prisma.shrinePrayStatsDaily.findUnique({
      where: {
        shrine_id_user_id: {
          shrine_id: shrineId,
          user_id: userId
        }
      }
    });
    const hasPrayedToday = todayPrayStats && todayPrayStats.count > 0;
    
    // 3. 遥拝回数制限
    const maxWorshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);
    const canRemotePray = todayWorshipCount < maxWorshipCount; // 神社個別の制限は削除
    
    // 4. 参拝可能距離
    const prayDistance = await getUserPrayDistance(userId);
    
    const response = {
      shrine_id: shrineId,
      total_pray_count: totalPrayCount,
      is_in_zukan: isInZukan,
      has_prayed_today: hasPrayedToday,
      can_remote_pray: canRemotePray,
      pray_distance: prayDistance,
      max_worship_count: maxWorshipCount,
      today_worship_count: todayWorshipCount
    };
    
    //console.log(`Shrine marker status for shrine ${shrineId}, user ${userId}:`, response);
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching shrine marker status:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// アップロード設定
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('画像ファイルのみアップロード可能です'));
    }
    cb(null, true);
  }
});

// 保存先ディレクトリ作成
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 画像リサイズ設定
const sizes = {
  marker: 64,
  thumbnail: 128,
  original: 1024
};

// ファイル名生成
function getImageFileName(type, id, userId, size, ext = 'jpg') {
  return `${type}${id}-u${userId}_s${size}.${ext}`;
}

// yyyyMM取得
function getYYYYMM() {
  const now = new Date();
  return `${now.getFullYear()}${('0' + (now.getMonth() + 1)).slice(-2)}`;
}

// Shrine画像アップロードAPI
app.post('/shrines/:id/images/upload', authenticateJWT, upload.single('image'), async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  if (isNaN(shrineId) || !req.file) {
    return res.status(400).json({ error: 'IDまたは画像が不正です' });
  }
  try {
    const yyyymm = getYYYYMM();
    const dir = path.join(__dirname, '..', 'uploads', yyyymm);
    ensureDirSync(dir);
    
    // 5サイズ保存
    const markerPath = path.join(dir, getImageFileName('shrine', shrineId, userId, 'marker'));
    const thumbPath = path.join(dir, getImageFileName('shrine', shrineId, userId, 'thumbnail'));
    const origPath = path.join(dir, getImageFileName('shrine', shrineId, userId, 'original'));
    const size128Path = path.join(dir, getImageFileName('shrine', shrineId, userId, '128'));
    const size256Path = path.join(dir, getImageFileName('shrine', shrineId, userId, '256'));
    const size512Path = path.join(dir, getImageFileName('shrine', shrineId, userId, '512'));
    
    await sharp(req.file.buffer).resize(64, 64).jpeg({ quality: 90 }).toFile(markerPath);
    await sharp(req.file.buffer).resize(128, 128).jpeg({ quality: 90 }).toFile(size128Path);
    await sharp(req.file.buffer).resize(256, 256).jpeg({ quality: 90 }).toFile(size256Path);
    await sharp(req.file.buffer).resize(512, 512).jpeg({ quality: 90 }).toFile(size512Path);
    await sharp(req.file.buffer).resize(sizes.original, sizes.original, { fit: 'inside' }).jpeg({ quality: 90 }).toFile(origPath);
    
    // URL生成
    const originalUrl = `/uploads/${yyyymm}/${getImageFileName('shrine', shrineId, userId, 'original')}`;
    const url64 = `/uploads/${yyyymm}/${getImageFileName('shrine', shrineId, userId, 'marker')}`;
    const url128 = `/uploads/${yyyymm}/${getImageFileName('shrine', shrineId, userId, '128')}`;
    const url256 = `/uploads/${yyyymm}/${getImageFileName('shrine', shrineId, userId, '256')}`;
    const url512 = `/uploads/${yyyymm}/${getImageFileName('shrine', shrineId, userId, '512')}`;
    const votingMonth = yyyymm;
    
    // ユーザー情報取得
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Imageテーブルに登録
    const image = await prisma.image.create({
      data: {
        url: originalUrl,
        url64: url64,
        url128: url128,
        url256: url256,
        url512: url512
      }
    });
    
    // 現在のサムネイルがあるかチェック
    const currentThumbnail = await prisma.shrineImage.findFirst({
      where: { shrine_id: shrineId, is_current_thumbnail: true }
    });
    
    // ShrineImageテーブルに登録
    const newImage = await prisma.shrineImage.create({
      data: {
        shrine_id: shrineId,
        user_id: userId,
        image_id: image.id,
        voting_month: votingMonth,
        is_current_thumbnail: !currentThumbnail // サムネイルがない場合は即採用
      }
    });
    
    // サムネイルがない場合は神社テーブルも更新
    if (!currentThumbnail) {
      await prisma.shrine.update({
        where: { id: shrineId },
        data: {
          image_id: image.id,
          image_url: originalUrl,
          image_url64: url64,
          image_url128: url128,
          image_url256: url256,
          image_url512: url512,
          image_by: user?.name || '不明'
        }
      });
    }
    
    res.json({ success: true, image: { ...newImage, ...image }, isCurrentThumbnail: !currentThumbnail });
  } catch (err) {
    console.error('Shrine画像アップロード失敗:', err);
    res.status(500).json({ error: '画像アップロード失敗' });
  }
});

// Diety画像アップロードAPI
app.post('/dieties/:id/images/upload', authenticateJWT, upload.single('image'), async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  if (isNaN(dietyId) || !req.file) {
    return res.status(400).json({ error: 'IDまたは画像が不正です' });
  }
  try {
    const yyyymm = getYYYYMM();
    const dir = path.join(__dirname, '..', 'uploads', yyyymm);
    ensureDirSync(dir);
    
    // 5サイズ保存
    const markerPath = path.join(dir, getImageFileName('diety', dietyId, userId, 'marker'));
    const thumbPath = path.join(dir, getImageFileName('diety', dietyId, userId, 'thumbnail'));
    const origPath = path.join(dir, getImageFileName('diety', dietyId, userId, 'original'));
    const size128Path = path.join(dir, getImageFileName('diety', dietyId, userId, '128'));
    const size256Path = path.join(dir, getImageFileName('diety', dietyId, userId, '256'));
    const size512Path = path.join(dir, getImageFileName('diety', dietyId, userId, '512'));
    
    await sharp(req.file.buffer).resize(64, 64).jpeg({ quality: 90 }).toFile(markerPath);
    await sharp(req.file.buffer).resize(128, 128).jpeg({ quality: 90 }).toFile(size128Path);
    await sharp(req.file.buffer).resize(256, 256).jpeg({ quality: 90 }).toFile(size256Path);
    await sharp(req.file.buffer).resize(512, 512).jpeg({ quality: 90 }).toFile(size512Path);
    await sharp(req.file.buffer).resize(sizes.original, sizes.original, { fit: 'inside' }).jpeg({ quality: 90 }).toFile(origPath);
    
    // URL生成
    const originalUrl = `/uploads/${yyyymm}/${getImageFileName('diety', dietyId, userId, 'original')}`;
    const url64 = `/uploads/${yyyymm}/${getImageFileName('diety', dietyId, userId, 'marker')}`;
    const url128 = `/uploads/${yyyymm}/${getImageFileName('diety', dietyId, userId, '128')}`;
    const url256 = `/uploads/${yyyymm}/${getImageFileName('diety', dietyId, userId, '256')}`;
    const url512 = `/uploads/${yyyymm}/${getImageFileName('diety', dietyId, userId, '512')}`;
    const votingMonth = yyyymm;
    
    // ユーザー情報取得
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Imageテーブルに登録
    const image = await prisma.image.create({
      data: {
        url: originalUrl,
        url64: url64,
        url128: url128,
        url256: url256,
        url512: url512
      }
    });
    
    // 現在のサムネイルがあるかチェック
    const currentThumbnail = await prisma.dietyImage.findFirst({
      where: { diety_id: dietyId, is_current_thumbnail: true }
    });
    
    // DietyImageテーブルに登録
    const newImage = await prisma.dietyImage.create({
      data: {
        diety_id: dietyId,
        user_id: userId,
        image_id: image.id,
        voting_month: votingMonth,
        is_current_thumbnail: !currentThumbnail // サムネイルがない場合は即採用
      }
    });
    
    // サムネイルがない場合は神様テーブルも更新
    if (!currentThumbnail) {
      await prisma.diety.update({
        where: { id: dietyId },
        data: {
          image_id: image.id,
          image_url: originalUrl,
          image_url64: url64,
          image_url128: url128,
          image_url256: url256,
          image_url512: url512,
          image_by: user?.name || '不明'
        }
      });
    }
    
    res.json({ success: true, image: { ...newImage, ...image }, isCurrentThumbnail: !currentThumbnail });
  } catch (err) {
    console.error('Diety画像アップロード失敗:', err);
    res.status(500).json({ error: '画像アップロード失敗' });
  }
});

// 画像リスト取得API（神社）
app.get('/shrines/:id/images', async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  if (isNaN(shrineId)) return res.status(400).json({ error: 'Invalid shrine ID' });
  try {
    const votingMonth = req.query.votingMonth;
    const where: any = { shrine_id: shrineId };
    if (votingMonth) {
      where.voting_month = votingMonth;
    }
    const images = await prisma.shrineImage.findMany({
      where,
      include: { 
        user: { select: { id: true, name: true } }, 
        votes: true,
        image: true
      },
      orderBy: [{ is_winner: 'desc' }, { uploaded_at: 'desc' }]
    });
    res.json(images);
  } catch (err) {
    console.error('神社画像リスト取得失敗:', err);
    res.status(500).json({ error: '画像リスト取得失敗' });
  }
});

// 画像リスト取得API（神様）
app.get('/dieties/:id/images', async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  if (isNaN(dietyId)) return res.status(400).json({ error: 'Invalid diety ID' });
  try {
    const images = await prisma.dietyImage.findMany({
      where: { diety_id: dietyId },
      include: { 
        user: { select: { id: true, name: true } }, 
        votes: true,
        image: true
      },
      orderBy: [{ is_winner: 'desc' }, { uploaded_at: 'desc' }]
    });
    res.json(images);
  } catch (err) {
    console.error('神様画像リスト取得失敗:', err);
    res.status(500).json({ error: '画像リスト取得失敗' });
  }
});

// 投票API（神社画像）
app.post('/shrines/:shrineId/images/:imageId/vote', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.shrineId, 10);
  const imageId = parseInt(req.params.imageId, 10);
  const userId = req.user.id;
  if (isNaN(shrineId) || isNaN(imageId)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    // 投票権チェック（図鑑登録済みユーザーのみ）
    const hasCatalog = await prisma.shrineCatalog.findUnique({ where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } } });
    if (!hasCatalog) return res.status(403).json({ error: '投票権がありません（参拝履歴なし）' });
    // 既存投票削除（1ユーザー1票）
    await prisma.imageVote.deleteMany({ where: { user_id: userId, shrine_image_id: imageId } });
    // 投票
    await prisma.imageVote.create({ data: { user_id: userId, shrine_image_id: imageId } });
    
    // 投票結果に基づいてサムネイル更新をチェック
    await updateShrineThumbnailFromVotes(shrineId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('神社画像投票失敗:', err);
    res.status(500).json({ error: '投票失敗' });
  }
});

// 投票API（神様画像）
app.post('/dieties/:dietyId/images/:imageId/vote', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.dietyId, 10);
  const imageId = parseInt(req.params.imageId, 10);
  const userId = req.user.id;
  if (isNaN(dietyId) || isNaN(imageId)) return res.status(403).json({ error: 'Invalid ID' });
  try {
    // 投票権チェック（図鑑登録済みユーザーのみ）
    const hasCatalog = await prisma.dietyCatalog.findUnique({ where: { user_id_diety_id: { user_id: userId, diety_id: dietyId } } });
    if (!hasCatalog) return res.status(403).json({ error: '投票権がありません（参拝履歴なし）' });
    // 既存投票削除（1ユーザー1票）
    await prisma.dietyImageVote.deleteMany({ where: { user_id: userId, diety_image_id: imageId } });
    // 投票
    await prisma.dietyImageVote.create({ data: { user_id: userId, diety_image_id: imageId } });
    
    // 投票結果に基づいてサムネイル更新をチェック
    await updateDietyThumbnailFromVotes(dietyId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('神様画像投票失敗:', err);
    res.status(500).json({ error: '投票失敗' });
  }
});

// 投票・審査期間設定取得API
app.get('/voting/settings', async (req, res) => {
  try {
    const settings = await prisma.votingSettings.findFirst({ orderBy: { updated_at: 'desc' } });
    res.json(settings || { voting_period_days: 20, review_period_days: 10 });
  } catch (err) {
    console.error('投票設定取得失敗:', err);
    res.status(500).json({ error: '設定取得失敗' });
  }
});

// --- ログをファイルにも出力する仕組みを追加 ---
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
function getLogFilePath() {
  const now = new Date();
  const y = now.getFullYear();
  const m = ('0' + (now.getMonth() + 1)).slice(-2);
  const d = ('0' + now.getDate()).slice(-2);
  return path.join(LOG_DIR, `backend-${y}${m}${d}.log`);
}
function appendLogToFile(level, ...args) {
  const msg = `[${new Date().toISOString()}][${level}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n';
  fs.appendFile(getLogFilePath(), msg, () => {});
}
const origLog = console.log;
const origError = console.error;
console.log = (...args) => {
  origLog(...args);
  appendLogToFile('INFO', ...args);
};
console.error = (...args) => {
  origError(...args);
  appendLogToFile('ERROR', ...args);
};

// --- ランキング集計と報酬付与機能 ---

// 週番号を取得する関数
function getWeekNumber(date) {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return (
    1 + Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

// 週間ランキング1位に経験値・能力値を付与する関数
async function awardWeeklyRewards(currentDate) {
  console.log(`🏆 週間ランキング1位の報酬付与処理を開始...`);
  
  const dateFormat = (date) => `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
  const periodLabel = dateFormat(currentDate);
  
  try {
    console.log(`📊 週間ランキング集計開始: ${periodLabel}`);
    
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
    
    // 神社ランキング1位に経験値を付与
    if (shrineStats.length > 0 && shrineStats[0].count > 0) {
      const topShrine = shrineStats[0];
      const expReward = EXP_REWARDS.WEEKLY_RANKING; // 週間は100EXP
      
      // 経験値を付与
      const expResult = await addExperience(prisma, topShrine.user.id, expReward, 'WEEKLY_RANKING');
      
      console.log(`🏆 神社ランキング1位: ${topShrine.user.name} が週間報酬を獲得 (${expReward}EXP)`);
      if (expResult.levelUp) {
        console.log(`🏆 神社ランキング1位: ${topShrine.user.name} レベルアップ →${expResult.newLevel}, 獲得AP: ${expResult.abilityPointsGained}`);
      }
    } else {
      console.log(`📊 週間神社ランキング: 該当者なし`);
    }
    
    // 神様ランキング1位に経験値を付与
    if (dietyStats.length > 0 && dietyStats[0].count > 0) {
      const topDiety = dietyStats[0];
      const expReward = EXP_REWARDS.WEEKLY_RANKING; // 週間は100EXP
      
      // 経験値を付与
      const expResult = await addExperience(prisma, topDiety.user.id, expReward, 'WEEKLY_RANKING');
      
      console.log(`🏆 神様ランキング1位: ${topDiety.user.name} が週間報酬を獲得 (${expReward}EXP)`);
      if (expResult.levelUp) {
        console.log(`🏆 神様ランキング1位: ${topDiety.user.name} レベルアップ →${expResult.newLevel}, 獲得AP: ${expResult.abilityPointsGained}`);
      }
    } else {
      console.log(`📊 週間神様ランキング: 該当者なし`);
    }
    
    console.log(`📊 週間ランキング集計完了: ${periodLabel}`);
    console.log(`🏆 週間ランキング1位の報酬付与処理が完了しました`);
    
    // 週間ランキングテーブルをクリア
    console.log(`🗑️ 週間ランキングテーブルをクリア中...`);
    await prisma.shrinePrayStatsWeekly.deleteMany();
    await prisma.dietyPrayStatsWeekly.deleteMany();
    console.log(`✅ 週間ランキングテーブルのクリアが完了しました`);
    
  } catch (error) {
    console.error(`❌ 週間ランキング報酬付与エラー:`, error);
  }
}

// ランキング1位の人に称号を付与する汎用関数
async function awardRankingTitles(period, currentDate) {
  console.log(`🏆 ${period}ランキング1位の称号付与処理を開始...`);

  // 具体的な期間を生成
  const getPeriodText = (period, currentDate) => {
    if (period === 'yearly') {
      return `${currentDate.getFullYear()}`;
    } else if (period === 'monthly') {
      return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }
    return period;
  };
  
  const periodText = getPeriodText(period, currentDate);

  try {
    console.log(`📊 ${periodText}ランキング集計開始`);
    
    // 神社ごとに1位～3位ユーザーに付与
    const shrineModel = period === 'yearly' ? prisma.shrinePrayStatsYearly : prisma.shrinePrayStatsMonthly;
    const allShrines = await prisma.shrine.findMany({ select: { id: true, name: true } });
    
    console.log(`📊 ${periodText}神社ランキング集計: ${allShrines.length}神社を処理中...`);
    
    for (const shrine of allShrines) {
      // その神社の上位3件を取得
      const topStats = await shrineModel.findMany({
        where: { shrine_id: shrine.id },
        orderBy: { count: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true } } }
      });
      
      if (topStats.length === 0) continue;

      const titleCode = period === 'yearly' ? 'yearly_rank_shrine' : 'monthly_rank_shrine';
      const titleMaster = await prisma.titleMaster.findUnique({ where: { code: titleCode } });
      
      for (let i = 0; i < topStats.length; i++) {
        const stat = topStats[i];
        const rank = i + 1;
        
        if (!titleMaster) {
          console.log(`❌ 称号マスターが見つかりません: ${titleCode}`);
          continue;
        }
        
        // 表示名を生成
        let displayName = titleMaster.name_template;
        const embedData = {
          shrine: shrine.name,
          shrine_id: shrine.id,
          rank: rank + '位',
          period: periodText,
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }
        
        // 既存の称号を確認してから作成または更新
        const existingTitle = await prisma.userTitle.findFirst({
          where: {
            user_id: stat.user.id,
            title_id: titleMaster.id,
            embed_data: {
              equals: embedData
            }
          }
        });
        
        if (existingTitle) {
          // 既存の称号を更新
          await prisma.userTitle.update({
            where: { id: existingTitle.id },
            data: {
              awarded_at: new Date(),
              grade: rank <= 3 ? 5 - rank : 1,
              display_name: displayName
            }
          });
        } else {
          // 新しい称号を作成
          await prisma.userTitle.create({
            data: {
              user_id: stat.user.id,
              title_id: titleMaster.id,
              awarded_at: new Date(),
              embed_data: embedData,
              grade: rank <= 3 ? 5 - rank : 1,
              display_name: displayName
            }
          });
        }
        // 称号獲得時のポイント付与
        const titlePoint = await prisma.titleMaster.findUnique({
          where: { id: titleMaster.id },
          select: { exp_reward: true }
        });
        // exp_rewardを参照して経験値付与
        const expReward = titlePoint?.exp_reward || 0;
        const expResult = await addExperience(prisma, stat.user.id, expReward, 'TITLE_ACQUISITION');
        console.log(`🏆 神社${periodText}${rank}位: ${stat.user.name} (${shrine.name}) が称号「${titleMaster.name_template}」を獲得 (${expReward}EXP)`);
        if (expResult.levelUp) {
          console.log(`🏆 神社${periodText}${rank}位: ${stat.user.name} レベルアップ →${expResult.newLevel}, 獲得AP: ${expResult.abilityPointsGained}`);
        }
      }
    }
    
    // 神様ごとに1位～3位ユーザーに付与
    const dietyModel = period === 'yearly' ? prisma.dietyPrayStatsYearly : prisma.dietyPrayStatsMonthly;
    const allDieties = await prisma.diety.findMany({ select: { id: true, name: true } });
    
    console.log(`📊 ${periodText}神様ランキング集計: ${allDieties.length}神様を処理中...`);
    
    for (const diety of allDieties) {
      const maxStat = await dietyModel.findFirst({
        where: { diety_id: diety.id },
        orderBy: { count: 'desc' }
      });
      if (!maxStat || maxStat.count === 0) continue;
      const topStats = await dietyModel.findMany({
        where: { diety_id: diety.id, count: maxStat.count },
        include: { user: { select: { id: true, name: true } } }
      });
      const titleCode = period === 'yearly' ? 'yearly_rank_diety' : 'monthly_rank_diety';
      const titleMaster = await prisma.titleMaster.findUnique({ where: { code: titleCode } });
      for (const stat of topStats) {
        if (!titleMaster) {
          console.log(`❌ 称号マスターが見つかりません: ${titleCode}`);
          continue;
        }
        // 表示名を生成
        let displayName = titleMaster.name_template;
        const embedData = {
          diety: diety.name,
          diety_id: diety.id,
          rank: '1位',
          period: periodText,
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }
        
        // 既存の称号を確認してから作成または更新
        const existingDietyTitle = await prisma.userTitle.findFirst({
          where: {
            user_id: stat.user.id,
            title_id: titleMaster.id,
            embed_data: {
              equals: embedData
            }
          }
        });
        
        if (existingDietyTitle) {
          // 既存の称号を更新
          await prisma.userTitle.update({
            where: { id: existingDietyTitle.id },
            data: {
              awarded_at: new Date(),
              grade: 5,
              display_name: displayName
            }
          });
        } else {
          // 新しい称号を作成
          await prisma.userTitle.create({
            data: {
              user_id: stat.user.id,
              title_id: titleMaster.id,
              awarded_at: new Date(),
              embed_data: embedData,
              grade: 5,
              display_name: displayName
            }
          });
        }
        const expReward = period === 'yearly' ? 500 : 200;
        const expResult = await addExperience(prisma, stat.user.id, expReward, 'YEARLY_RANKING_1');
        console.log(`🏆 神様${periodText}ランキング1位: ${stat.user.name} (${diety.name}) が称号「${titleMaster.name_template}」を獲得 (${expReward}EXP)`);
        if (expResult.levelUp) {
          console.log(`🏆 神様${periodText}ランキング1位: ${stat.user.name} レベルアップ →${expResult.newLevel}, 獲得AP: ${expResult.abilityPointsGained}`);
        }
      }
    }
    console.log(`📊 ${periodText}ランキング集計完了`);
    console.log(`🏆 ${period}ランキング1位の称号付与処理が完了しました`);
    
    // ランキングテーブルをクリア
    console.log(`🗑️ ${periodText}ランキングテーブルをクリア中...`);
    if (period === 'yearly') {
      await prisma.shrinePrayStatsYearly.deleteMany();
      await prisma.dietyPrayStatsYearly.deleteMany();
    } else {
      await prisma.shrinePrayStatsMonthly.deleteMany();
      await prisma.dietyPrayStatsMonthly.deleteMany();
    }
    console.log(`✅ ${periodText}ランキングテーブルのクリアが完了しました`);
    
  } catch (error) {
    console.error(`❌ ${period}ランキング称号付与エラー:`, error);
  }
}

// 定期的なランキング集計処理を実行する関数
async function runPeriodicRankingAwards() {
  const now = new Date();
  
  // 週間ランキング（月曜日の午前0時に実行）
  if (now.getDay() === 1 && now.getHours() === 0) {
    console.log(`🕐 定期実行: 週間ランキング集計を開始します`);
    await awardWeeklyRewards(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  }
  
  // 月間ランキング（月初の午前0時に実行）
  if (now.getDate() === 1 && now.getHours() === 0) {
    console.log(`🕐 定期実行: 月間ランキング集計を開始します`);
    await awardRankingTitles('monthly', new Date(now.getFullYear(), now.getMonth() - 1, 0));
  }
  
  // 年間ランキング（1月1日の午前0時に実行）
  if (now.getMonth() === 0 && now.getDate() === 1 && now.getHours() === 0) {
    console.log(`🕐 定期実行: 年間ランキング集計を開始します`);
    await awardRankingTitles('yearly', new Date(now.getFullYear() - 1, 11, 31));
  }
  
  // 日次処理（毎日午前0時に実行）
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    console.log(`🕐 定期実行: 日次ランキングテーブルクリアを開始します`);
    try {
      await prisma.shrinePrayStatsDaily.deleteMany();
      await prisma.dietyPrayStatsDaily.deleteMany();
      console.log(`✅ 日次ランキングテーブルのクリアが完了しました`);
    } catch (error) {
      console.error(`❌ 日次ランキングテーブルクリアエラー:`, error);
    }
  }
}

// 1分ごとに定期実行チェック
setInterval(runPeriodicRankingAwards, 60 * 1000); // 1分ごと

// 管理用API: ランキング集計と報酬付与を実行（type=weekly|monthly|yearly 指定で分岐）
app.post('/admin/ranking-awards', async (req, res) => {
  try {
    const currentDate = new Date();
    const type = req.query.type || 'weekly'; // デフォルトはweekly
    console.log(`🚀 管理API呼び出し: ランキング集計開始 (type=${type})`);
    let didSomething = false;
    if (type === 'weekly') {
      console.log(`📊 週間ランキング集計処理開始`);
      await awardWeeklyRewards(currentDate);
      console.log(`📊 週間ランキング集計処理完了`);
      didSomething = true;
    }
    if (type === 'monthly') {
      console.log(`📊 月間ランキング集計処理開始`);
      await awardRankingTitles('monthly', currentDate);
      console.log(`📊 月間ランキング集計処理完了`);
      didSomething = true;
    }
    if (type === 'yearly') {
      console.log(`📊 年間ランキング集計処理開始`);
      await awardRankingTitles('yearly', currentDate);
      console.log(`📊 年間ランキング集計処理完了`);
      didSomething = true;
    }
    if (!didSomething) {
      return res.status(400).json({ error: 'Invalid type' });
    }
    console.log(`✅ 管理API呼び出し: ランキング集計完了 (type=${type})`);
    res.json({ success: true, message: 'ランキング集計と報酬付与が完了しました' });
  } catch (error) {
    console.error('❌ ランキング集計と報酬付与エラー:', error);
    res.status(500).json({ error: 'ランキング集計と報酬付与に失敗しました' });
  }
});

// すべての未定義APIはJSONで404を返す

// すべての未定義APIはJSONで404を返す
app.use((req, res) => {
  res.status(404).json({ error: 'API not found' });
});

// 神社の投票結果に基づいてサムネイルを更新する関数
async function updateShrineThumbnailFromVotes(shrineId: number) {
  try {
    // 現在の投票期間の画像を取得
    const currentMonth = getYYYYMM();
    const images = await prisma.shrineImage.findMany({
      where: { 
        shrine_id: shrineId, 
        voting_month: currentMonth 
      },
      include: { 
        votes: true,
        image: true,
        user: true
      },
      orderBy: [
        { votes: { _count: 'desc' } },
        { uploaded_at: 'asc' } // 同票数の場合は早いものを優先
      ]
    });

    if (images.length === 0) return;

    // 最多票の画像を取得
    const topImage = images.reduce((prev, current) => 
      (current.votes.length > prev.votes.length) ? current : prev
    );

    // 現在のサムネイルと比較
    const currentThumbnail = await prisma.shrineImage.findFirst({
      where: { shrine_id: shrineId, is_current_thumbnail: true }
    });

    if (!currentThumbnail || currentThumbnail.id !== topImage.id) {
      // 現在のサムネイルを解除
      if (currentThumbnail) {
        await prisma.shrineImage.update({
          where: { id: currentThumbnail.id },
          data: { is_current_thumbnail: false }
        });
      }

      // 新しいサムネイルを設定
      await prisma.shrineImage.update({
        where: { id: topImage.id },
        data: { is_current_thumbnail: true }
      });

      // 神社テーブルを更新
      await prisma.shrine.update({
        where: { id: shrineId },
        data: {
          image_id: topImage.image.id,
          image_url: topImage.image.url,
          image_url64: topImage.image.url64,
          image_url128: topImage.image.url128,
          image_url256: topImage.image.url256,
          image_url512: topImage.image.url512,
          image_by: topImage.user.name
        }
      });

      console.log(`神社${shrineId}のサムネイルが投票結果により更新されました`);
    }
  } catch (err) {
    console.error('神社サムネイル更新エラー:', err);
  }
}

// 神様の投票結果に基づいてサムネイルを更新する関数
async function updateDietyThumbnailFromVotes(dietyId: number) {
  try {
    // 現在の投票期間の画像を取得
    const currentMonth = getYYYYMM();
    const images = await prisma.dietyImage.findMany({
      where: { 
        diety_id: dietyId, 
        voting_month: currentMonth 
      },
      include: { 
        votes: true,
        image: true,
        user: true
      },
      orderBy: [
        { votes: { _count: 'desc' } },
        { uploaded_at: 'asc' } // 同票数の場合は早いものを優先
      ]
    });

    if (images.length === 0) return;

    // 最多票の画像を取得
    const topImage = images.reduce((prev, current) => 
      (current.votes.length > prev.votes.length) ? current : prev
    );

    // 現在のサムネイルと比較
    const currentThumbnail = await prisma.dietyImage.findFirst({
      where: { diety_id: dietyId, is_current_thumbnail: true }
    });

    if (!currentThumbnail || currentThumbnail.id !== topImage.id) {
      // 現在のサムネイルを解除
      if (currentThumbnail) {
        await prisma.dietyImage.update({
          where: { id: currentThumbnail.id },
          data: { is_current_thumbnail: false }
        });
      }

      // 新しいサムネイルを設定
      await prisma.dietyImage.update({
        where: { id: topImage.id },
        data: { is_current_thumbnail: true }
      });

      // 神様テーブルを更新
      await prisma.diety.update({
        where: { id: dietyId },
        data: {
          image_id: topImage.image.id,
          image_url: topImage.image.url,
          image_url64: topImage.image.url64,
          image_url128: topImage.image.url128,
          image_url256: topImage.image.url256,
          image_url512: topImage.image.url512,
          image_by: topImage.user.name
        }
      });

      console.log(`神様${dietyId}のサムネイルが投票結果により更新されました`);
    }
  } catch (err) {
    console.error('神様サムネイル更新エラー:', err);
  }
}
