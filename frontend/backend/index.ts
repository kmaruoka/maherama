require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodeCrypto = require('crypto');
const nodemailer = require('nodemailer');
const levelSystemModule = require('./shared/constants/levelSystem');
const expSystemModule = require('./shared/utils/expSystem');
const expRewardsModule = require('./shared/constants/expRewards');

// APIロガーのインポート
const { apiLogger, errorLogger, apiStats, createApiLogger } = require('./utils/apiLogger.js');
const { createRateLimiter } = require('./utils/rateLimiter');

// API監視のインポート
const { getMonitoringStats, updateConfig } = require('./utils/apiMonitor.js');

// Stripe初期化（APIキーが設定されている場合のみ）
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// 環境変数のチェック
if (!process.env.PORT) {
  console.error('エラー: PORT環境変数が設定されていません');
  console.error('例: PORT=3000 npm start');
  process.exit(1);
}

// 本番環境ではJWT_SECRETが必須
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('エラー: 本番環境ではJWT_SECRET環境変数が必須です');
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

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// データベース接続の確認
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// CORS設定
const whitelist = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || whitelist.length === 0 || whitelist.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// レート制限は createRateLimiter に統一済み

// APIロギングミドルウェアを追加（環境変数で制御）
const enableApiLogging = process.env.ENABLE_API_LOGGING !== 'false'; // デフォルトで有効
const enableApiStats = process.env.ENABLE_API_STATS !== 'false'; // デフォルトで有効

if (enableApiLogging) {
  const customApiLogger = createApiLogger({
    excludePaths: ['/health', '/images'], // ヘルスチェックと画像ファイルは除外
    excludeMethods: ['OPTIONS'], // OPTIONSリクエストは除外
    logRequestBody: process.env.LOG_REQUEST_BODY !== 'false', // デフォルトで有効
    logResponseBody: process.env.LOG_RESPONSE_BODY !== 'false', // デフォルトで有効
    maxResponseSize: parseInt(process.env.MAX_RESPONSE_LOG_SIZE || '1000'), // レスポンスボディの最大サイズを1000に制限
    // seedスクリプト用の設定
    isSeedMode: process.env.NODE_ENV === 'development' && process.env.SEED_MODE === 'true',
    seedUserIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // seedスクリプトで使用するユーザーID
  });

  // レート制限ミドルウェアを設定
  const rateLimiter = createRateLimiter({
    enabled: true,
    skipPaths: ['/health', '/images', '/api/seed-mode'], // ヘルスチェック、画像、シードモードAPIは除外
    skipMethods: ['OPTIONS'], // OPTIONSリクエストは除外
    skipSeedMode: true // シードモードの場合はレート制限をスキップ
  });

  app.use(rateLimiter);
  app.use(customApiLogger);
  console.log('✅ API Logging enabled');
  console.log(`📊 Max response size: ${process.env.MAX_RESPONSE_LOG_SIZE || '1000'} characters`);
  if (process.env.SEED_MODE === 'true') {
    console.log('🌱 Seed mode enabled - API monitoring relaxed for seed operations');
  }
} else {
  console.log('⚠️ API Logging disabled');
}

// API監視統計エンドポイント（管理者のみ）
app.get('/admin/api-monitoring/stats', requireAdmin, async (req, res) => {
  try {
    const stats = getMonitoringStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API monitoring stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring stats'
    });
  }
});

// API監視設定更新エンドポイント（管理者のみ）
app.post('/admin/api-monitoring/config', requireAdmin, async (req, res) => {
  try {
    const { config } = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid config object'
      });
    }

    updateConfig(config);
    res.json({
      success: true,
      message: 'Monitoring configuration updated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API monitoring config update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update monitoring config'
    });
  }
});

if (enableApiStats) {
  app.use(apiStats); // API統計情報の収集
  console.log('✅ API Stats enabled');
} else {
  console.log('⚠️ API Stats disabled');
}

// JSON解析ミドルウェア（画像アップロードエンドポイント以外に適用）
app.use((req, res, next) => {
  // 画像アップロードエンドポイントの場合はJSON解析をスキップ
  if (req.path.includes('/images/upload')) {
    return next();
  }
  express.json({ limit: '256kb' })(req, res, next);
});

app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// ヘルスチェックエンドポイント
app.get('/health', async (req, res) => {
  try {
    // データベース接続確認
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// APIログ設定取得エンドポイント
app.get('/api/logs/config', requireAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        enableApiLogging: process.env.ENABLE_API_LOGGING !== 'false',
        enableApiStats: process.env.ENABLE_API_STATS !== 'false',
        logRequestBody: process.env.LOG_REQUEST_BODY !== 'false',
        logResponseBody: process.env.LOG_RESPONSE_BODY !== 'false',
        maxResponseSize: parseInt(process.env.MAX_RESPONSE_LOG_SIZE || '2000'),
        excludePaths: ['/health', '/images'],
        excludeMethods: ['OPTIONS']
      }
    });
  } catch (error) {
    console.error('API Log Config Error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// APIログテストエンドポイント
app.post('/api/logs/test', (req, res) => {
  try {
    const testData = {
      message: 'APIログテスト',
      timestamp: new Date().toISOString(),
      requestBody: req.body,
      queryParams: req.query,
      headers: req.headers
    };

    res.json({
      success: true,
      message: 'APIログテストが完了しました',
      data: testData
    });
  } catch (error) {
    console.error('API Log Test Error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// メール送信設定
let transporter;

// 開発・本番環境共通のSMTP設定
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('警告: SMTP設定が不完全です。メール送信機能が無効になります。');
  transporter = {
    sendMail: async () => {
      console.warn('メール送信がスキップされました（SMTP設定なし）');
      return { messageId: 'skipped-' + Date.now() };
    }
  };
} else {
  // 設定されたSMTPサーバーを使用
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// 認証関連のユーティリティ関数
function generateToken() {
  return nodeCrypto.randomBytes(32).toString('hex');
}

function generateVerificationToken() {
  return nodeCrypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail(email, token, username) {

  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate?token=${token}`;

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: '会員登録確認のご案内 - JINJOURNEY',
    html: `
      <p>${username} 様</p>
      <p>このたびは【JINJOURNEY】にご登録いただきありがとうございます。<br>
      24時間以内に下記リンクをクリックして、会員登録を完了してください。</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>もしこのメールにお心当たりがない場合は、このメールを破棄してください。</p>
      <p>JINJOURNEY 運営チーム</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

async function sendPasswordResetEmail(email, token) {
  // 開発環境の場合は常にメール送信を試行
  if (process.env.NODE_ENV !== 'development' && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log('SMTP settings not configured, skipping email sending');
    return;
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || 'noreply@maherama.local',
    to: email,
    subject: 'パスワードリセット - 神社参拝アプリ',
    html: `
      <h2>パスワードリセット</h2>
      <p>以下のリンクをクリックしてパスワードをリセットしてください：</p>
      <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">パスワードをリセット</a>
      <p>このリンクは1時間有効です。</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

let lastRemotePray = null;
const REMOTE_INTERVAL_DAYS = 7;

// シミュレート日付管理
let simulateDate = null;

// 現在日時を取得する関数（シミュレート日付がある場合はそれを使用）
function getCurrentDate() {
  return simulateDate || new Date();
}

// シミュレート日付を設定
function setSimulateDate(dateString) {
  try {
    if (dateString === null) {
      simulateDate = null;
      return { success: true, message: 'シミュレート日付をクリアしました' };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { success: false, message: '無効な日付形式です' };
    }

    simulateDate = date;
    return { success: true, message: `シミュレート日付を設定しました: ${date.toISOString()}` };
  } catch (error) {
    console.error('setSimulateDate error:', error);
    return { success: false, message: '日付設定中にエラーが発生しました' };
  }
}

// シミュレート日付を取得
function getSimulateDate() {
  return simulateDate ? simulateDate.toISOString() : null;
}

// ミッション達成チェックと報酬付与
async function checkAndRewardMissions(userId: number, shrineId?: number, dietyId?: number) {
  const currentDate = getCurrentDate();

  // ユーザーの進行中ミッションを取得
  const userMissions = await prisma.userMission.findMany({
    where: {
      user_id: userId,
      is_completed: false
    },
    include: {
      mission: {
        include: {
          mission_shrines: {
            include: {
              shrine: true
            }
          },
          mission_dieties: {
            include: {
              diety: true
            }
          }
        }
      }
    }
  });



  const completedMissions = [];

  for (const userMission of userMissions) {
    const mission = userMission.mission;



    // イベントミッションの場合は期間チェック
    if (mission.mission_type === 'event') {
      if (mission.start_at && currentDate < mission.start_at) {
              continue;
      }
      if (mission.end_at && currentDate > mission.end_at) {
        continue;
      }
    }

    let progress = 0;
    let totalRequired = 0;

    // 神社参拝ミッションのチェック
    if (mission.mission_shrines.length > 0) {

      for (const missionShrine of mission.mission_shrines) {
        totalRequired += missionShrine.count;

        // 参拝回数をカウント（ShrinePray + RemotePray）
        const shrinePrayCount = await prisma.shrinePray.count({
          where: {
            user_id: userId,
            shrine_id: missionShrine.shrine_id
          }
        });
        const remotePrayCount = await prisma.remotePray.count({
          where: {
            user_id: userId,
            shrine_id: missionShrine.shrine_id
          }
        });
        const totalPrayCount = shrinePrayCount + remotePrayCount;
        progress += Math.min(totalPrayCount, missionShrine.count);


      }
    }

    // 神様参拝ミッションのチェック
    if (mission.mission_dieties.length > 0) {

      for (const missionDiety of mission.mission_dieties) {
        totalRequired += missionDiety.count;

        // 過去の参拝回数をカウント（今回の参拝も含む）
        const prayCount = await prisma.dietyPray.count({
          where: {
            user_id: userId,
            diety_id: missionDiety.diety_id
          }
        });
        progress += Math.min(prayCount, missionDiety.count);


      }
    }

    // ミッション達成チェック
    if (progress >= totalRequired && totalRequired > 0) {
      // ミッション達成
      await prisma.userMission.update({
        where: {
          user_id_mission_id: {
            user_id: userId,
            mission_id: mission.id
          }
        },
        data: {
          progress: totalRequired,
          is_completed: true,
          completed_at: currentDate
        }
      });

      // 報酬付与
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user) {
        let updatedUser = { ...user };

        // 経験値報酬
        if (mission.exp_reward > 0) {
          await expSystemModule.addExperience(prisma, userId, mission.exp_reward, 'MISSION_COMPLETION');
        }

        // 能力値報酬
        if (mission.ability_reward) {
          const abilityReward = mission.ability_reward as any;
          for (const [abilityId, points] of Object.entries(abilityReward)) {
            updatedUser.ability_points += points as number;
          }
        }

        // 称号報酬
        const missionTitles = await prisma.missionTitle.findMany({
          where: { mission_id: mission.id },
          include: { title: true }
        });

        for (const missionTitle of missionTitles) {
          await prisma.userTitle.create({
            data: {
              user_id: userId,
              title_id: missionTitle.title_id,
              awarded_at: currentDate,
              display_name: missionTitle.title.name_template
            }
          });
        }

        // ユーザー情報更新
        await prisma.user.update({
          where: { id: userId },
          data: {
            exp: updatedUser.exp,
            level: updatedUser.level,
            ability_points: updatedUser.ability_points
          }
        });
      }

      completedMissions.push({
        id: mission.id,
        name: mission.name,
        content: mission.content,
        exp_reward: mission.exp_reward,
        ability_reward: mission.ability_reward
      });
    } else {

      // 進捗更新
      await prisma.userMission.update({
        where: {
          user_id_mission_id: {
            user_id: userId,
            mission_id: mission.id
          }
        },
        data: {
          progress: progress
        }
      });
    }
  }


  return completedMissions;
}





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
        gt: getCurrentDate()
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
        gt: getCurrentDate()
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
  const today = getCurrentDate();
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

async function getUserSubscription(userId) {
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      user_id: userId,
      is_active: true,
      expires_at: { gt: getCurrentDate() }
    },
    orderBy: { created_at: 'desc' }
  });
  return { subscriptions };
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
app.get('/api/shrines/all', async (req, res) => {
  try {
    const shrines = await prisma.shrine.findMany({
      select: {
        id: true,
        name: true,
        kana: true,
        location: true,
        lat: true,
        lng: true,
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
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
      dieties: (shrine.shrine_dieties || []).map(sd => sd.diety)
    }));
    //console.log(`/shrines/all: ${formattedShrines.length}件返却`);

    res.json(formattedShrines);
  } catch (err) {
    console.error('Error fetching all shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/shrines', async (req, res) => {
  try {
    const shrines = await prisma.shrine.findMany({
                select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            image_id: true,
            image_url: true,
            image_url_xs: true,
            image_url_s: true,
            image_url_m: true,
            image_url_l: true,
            image_url_xl: true,
            image_by: true
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
      image_id: shrine.image_id,
      image_url: shrine.image_url,
      image_url_xs: shrine.image_url_xs,
      image_url_s: shrine.image_url_s,
      image_url_m: shrine.image_url_m,
      image_url_l: shrine.image_url_l,
      image_url_xl: shrine.image_url_xl,
      image_by: shrine.image_by
    }));

    res.json(formattedShrines);
  } catch (err) {
    console.error('Error fetching shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/shrines/:id', authenticateJWT, async (req, res) => {
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
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
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

    // 現在のユーザーの図鑑収録日と最終参拝日を取得
    let catalogedAt = null;
    let lastPrayedAt = null;
    const userId = req.user.id; // authenticateJWTミドルウェアで設定されたユーザーIDを使用

    if (userId) {
      const catalog = await prisma.shrineCatalog.findFirst({
        where: {
          user_id: userId,
          shrine_id: id
        },
        select: { cataloged_at: true, last_prayed_at: true }
      });

      if (catalog) {
        catalogedAt = catalog.cataloged_at;
        lastPrayedAt = catalog.last_prayed_at;
      }
    }

    if (!shrine) {
      return res.status(404).json({ error: 'Shrine not found' });
    }

    const result = {
      ...shrine,
      count: totalCount,
      catalogedAt: catalogedAt,
      lastPrayedAt: lastPrayedAt,
      dieties: (shrine.shrine_dieties || []).map(sd => sd.diety)
    };

    res.json(result);
  } catch (err) {
    console.error('Error fetching shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 個別神社の画像情報のみを取得するAPI
app.get('/api/shrines/:id/image', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: {
        id: true,
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
        image_by: true
      }
    });

    if (!shrine) {
      return res.status(404).json({ error: 'Shrine not found' });
    }

    res.json(shrine);
  } catch (err) {
    console.error('Error fetching shrine image:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 個別神様の画像情報のみを取得するAPI
app.get('/api/dietys/:id/image', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    const diety = await prisma.diety.findUnique({
      where: { id },
      select: {
        id: true,
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
        image_by: true
      }
    });

    if (!diety) {
      return res.status(404).json({ error: 'Diety not found' });
    }

    res.json(diety);
  } catch (err) {
    console.error('Error fetching diety image:', err);
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
    await prisma.remotePray.create({ data: { shrine_id: shrineId, user_id: userId, prayed_at: getCurrentDate() } });
  }

  // ShrineCatalog更新
  const shrineCatalogResult = await prisma.shrineCatalog.upsert({
    where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } },
    update: { last_prayed_at: getCurrentDate() },
    create: { user_id: userId, shrine_id: shrineId, last_prayed_at: getCurrentDate() }
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
      update: { last_prayed_at: getCurrentDate() },
      create: { user_id: userId, diety_id: dietyId, last_prayed_at: getCurrentDate() }
    });
  }

  // 総参拝数
  const totalCount = await prisma.shrinePrayStats.aggregate({
    where: { shrine_id: shrineId },
    _sum: { count: true }
  });

  // 経験値
  const expType = logType === '参拝' ? 'PRAY' : 'REMOTE_PRAY';
  const expReward = logType === '参拝' ? expRewardsModule.EXP_REWARDS.PRAY : expRewardsModule.EXP_REWARDS.REMOTE_PRAY;
  const expResult = await expSystemModule.addExperience(prisma, userId, expReward, expType);

  // ログ（神社と神様の両方をリンク表示）
  const dietyLinks = shrine.shrine_dieties.map(sd => `<diety:${sd.diety.id}:${sd.diety.name}>`);
  const dietyLinksText = dietyLinks.length > 0 ? `(${dietyLinks.join('、')})` : '';
  await addLog(`<shrine:${shrineId}:${shrine.name}>${dietyLinksText}を${logType}しました`);

  // ミッション達成チェック（神社と神様の両方）
  const completedMissions = [];
  for (const sd of shrine.shrine_dieties) {
    const missions = await checkAndRewardMissions(userId, shrineId, sd.diety.id);
    completedMissions.push(...missions);
  }

  return {
    success: true,
    count: totalCount._sum.count || 0,
    level_up: expResult.levelUp,
    new_level: expResult.newLevel,
    ability_points_gained: expResult.abilityPointsGained,
    completedMissions
  };
}

// 参拝API
app.post('/api/shrines/:id/pray', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.user.id;
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: '無効な神社IDです',
      error: 'Invalid shrine ID'
    });
  }
  // 距離チェック
  const shrine = await prisma.shrine.findUnique({ where: { id }, select: { lat: true, lng: true, name: true } });
  if (!shrine) {
    return res.status(404).json({
      success: false,
      type: 'error',
      message: '神社が見つかりません',
      error: 'Not found'
    });
  }
  if (req.body.lat == null || req.body.lng == null) {
    return res.status(400).json({
      success: false,
      type: 'warn',
      message: '位置情報が取得できません。GPSの設定を確認してください。',
      error: 'Location information required'
    });
  }

  // 共通化された距離計算関数を使用
  const { calculateDistance } = require('./shared/utils/distance');
  const dist = calculateDistance(
    { lat: req.body.lat, lng: req.body.lng },
    { lat: shrine.lat, lng: shrine.lng }
  );
  const prayDistance = await getUserPrayDistance(userId);
  if (dist > prayDistance) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: `距離が離れすぎているため参拝できません（距離: ${Math.round(dist)}m、参拝可能距離: ${prayDistance}m）`,
      error: 'Distance too far',
      data: { dist, radius: prayDistance }
    });
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
    return res.status(400).json({
      success: false,
      type: 'warn',
      message: 'この神社は今日既に参拝済みです',
      error: 'Already prayed today'
    });
  }

  try {
    const result = await prayAtShrine({
      prisma,
      shrineId: id,
      userId,
      logType: '参拝',
    });

    // 成功レスポンス
    res.json({
      success: true,
      type: 'success',
      message: `${shrine.name}に参拝しました`,
      data: result
    });
  } catch (err) {
    console.error('Error praying at shrine:', err);
    res.status(500).json({
      success: false,
      type: 'fatal',
      message: '参拝処理中にエラーが発生しました',
      error: 'DB error'
    });
  }
});

// 遥拝API
app.post('/api/shrines/:id/remote-pray', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.user.id;

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: '無効な神社IDです',
      error: 'Invalid shrine ID'
    });
  }

  // 神社情報を取得
  const shrine = await prisma.shrine.findUnique({
    where: { id },
    select: { name: true, lat: true, lng: true }
  });

  if (!shrine) {
    return res.status(404).json({
      success: false,
      type: 'error',
      message: '神社が見つかりません',
      error: 'Not found'
    });
  }

  // 距離チェック（リクエストボディに位置情報がある場合）
  let canPray = false;
  let hasLocationInfo = false;
  if (req.body.lat != null && req.body.lng != null) {
    hasLocationInfo = true;
    const { calculateDistance } = require('./shared/utils/distance');
    const dist = calculateDistance(
      { lat: req.body.lat, lng: req.body.lng },
      { lat: shrine.lat, lng: shrine.lng }
    );
    const prayDistance = await getUserPrayDistance(userId);
    canPray = dist <= prayDistance;

    // デバッグログ
    console.log(`[遥拝API] 距離チェック: 距離=${dist}m, 参拝可能距離=${prayDistance}m, 参拝可能=${canPray}`);
  } else {
    console.log(`[遥拝API] 位置情報なし: lat=${req.body.lat}, lng=${req.body.lng}`);
  }

  // 参拝可能な距離内であれば参拝として処理
  if (canPray) {
    // 参拝制限チェック: 1ユーザー1日1神社につき1回のみ
    const todaysPrayStats = await prisma.shrinePrayStatsDaily.findUnique({
      where: {
        shrine_id_user_id: {
          shrine_id: id,
          user_id: userId
        }
      }
    });

    if (todaysPrayStats && todaysPrayStats.count > 0) {
      // 当日参拝済みの場合は遥拝として処理
      // 遥拝回数チェック
      const maxWorshipCount = await getUserWorshipCount(userId);
      const todayWorshipCount = await getTodayWorshipCount(userId);

      if (todayWorshipCount >= maxWorshipCount) {
        return res.status(400).json({
          success: false,
          type: 'warn',
          message: `遥拝は1日に${maxWorshipCount}回までです（今日の使用回数: ${todayWorshipCount}回）`,
          error: 'Remote pray limit exceeded'
        });
      }

      try {
        const result = await prayAtShrine({
          prisma,
          shrineId: id,
          userId,
          logType: '遥拝',
        });

        // 成功レスポンス（遥拝メッセージ）
        res.json({
          success: true,
          type: 'success',
          message: `${shrine.name}を遥拝しました`,
          data: result
        });
      } catch (err) {
        console.error('Error remote praying at shrine:', err);
        res.status(500).json({
          success: false,
          type: 'fatal',
          message: '遥拝処理中にエラーが発生しました',
          error: 'DB error'
        });
      }
      return;
    }

    try {
      const result = await prayAtShrine({
        prisma,
        shrineId: id,
        userId,
        logType: '参拝',
      });

      // 成功レスポンス（参拝メッセージ）
      res.json({
        success: true,
        type: 'success',
        message: `${shrine.name}に参拝しました`,
        data: result
      });
    } catch (err) {
      console.error('Error praying at shrine:', err);
      res.status(500).json({
        success: false,
        type: 'fatal',
        message: '参拝処理中にエラーが発生しました',
        error: 'DB error'
      });
    }
  } else {
    // 参拝可能な距離外または位置情報がない場合は遥拝として処理
    // 遥拝回数チェック
    const maxWorshipCount = await getUserWorshipCount(userId);
    const todayWorshipCount = await getTodayWorshipCount(userId);

    if (todayWorshipCount >= maxWorshipCount) {
      return res.status(400).json({
        success: false,
        type: 'warn',
        message: `遥拝は1日に${maxWorshipCount}回までです（今日の使用回数: ${todayWorshipCount}回）`,
        error: 'Remote pray limit exceeded'
      });
    }

    try {
      const result = await prayAtShrine({
        prisma,
        shrineId: id,
        userId,
        logType: '遥拝',
      });

      // 成功レスポンス（遥拝メッセージ）
      res.json({
        success: true,
        type: 'success',
        message: `${shrine.name}を遥拝しました`,
        data: result
      });
    } catch (err) {
      console.error('Error remote praying at shrine:', err);
      res.status(500).json({
        success: false,
        type: 'fatal',
        message: '遥拝処理中にエラーが発生しました',
        error: 'DB error'
      });
    }
  }
});

// ミッション一覧取得API
app.get('/api/missions', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const currentDate = getCurrentDate();

    // 利用可能なミッションを取得
    const missions = await prisma.missionMaster.findMany({
      where: {
        OR: [
          { mission_type: 'permanent' },
          {
            mission_type: 'event',
            start_at: { lte: currentDate },
            end_at: { gte: currentDate }
          }
        ]
      },
      include: {
        mission_shrines: {
          include: {
            shrine: {
              select: {
                id: true,
                name: true,
                location: true
              }
            }
          }
        },
        mission_dieties: {
          include: {
            diety: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        mission_titles: {
          include: {
            title: {
              select: {
                id: true,
                name_template: true,
                description: true
              }
            }
          }
        }
      }
    });

    // ユーザーの進行状況を取得
    const userMissions = await prisma.userMission.findMany({
      where: { user_id: userId },
      select: {
        mission_id: true,
        progress: true,
        is_completed: true,
        completed_at: true
      }
    });

    const userMissionMap = new Map(userMissions.map(um => [um.mission_id, um]));



    // ミッション情報と進行状況を結合
    const missionsWithProgress = await Promise.all(missions.map(async (mission) => {
      const userMission = userMissionMap.get(mission.id) as any;
      const progress = userMission ? userMission.progress : 0;
      const isCompleted = userMission ? userMission.is_completed : false;
      const completedAt = userMission ? userMission.completed_at : null;

      // 必要回数を計算
      let totalRequired = 0;
      mission.mission_shrines.forEach(ms => totalRequired += ms.count);
      mission.mission_dieties.forEach(md => totalRequired += md.count);

      // 各神社の達成状況を計算
      const shrinesWithProgress = await Promise.all(mission.mission_shrines.map(async (ms) => {
        const shrinePrayCount = await prisma.shrinePray.count({
          where: {
            user_id: userId,
            shrine_id: ms.shrine_id
          }
        });
        const remotePrayCount = await prisma.remotePray.count({
          where: {
            user_id: userId,
            shrine_id: ms.shrine_id
          }
        });
        const totalPrayCount = shrinePrayCount + remotePrayCount;
        const achieved = Math.min(totalPrayCount, ms.count);
        const isCompleted = achieved >= ms.count;

        return {
          id: ms.shrine.id,
          name: ms.shrine.name,
          location: ms.shrine.location,
          count: ms.count,
          achieved: achieved,
          is_completed: isCompleted
        };
      }));

      // 各神様の達成状況を計算
      const dietiesWithProgress = await Promise.all(mission.mission_dieties.map(async (md) => {
        const prayCount = await prisma.dietyPray.count({
          where: {
            user_id: userId,
            diety_id: md.diety_id
          }
        });
        const achieved = Math.min(prayCount, md.count);
        const isCompleted = achieved >= md.count;

        return {
          id: md.diety.id,
          name: md.diety.name,
          count: md.count,
          achieved: achieved,
          is_completed: isCompleted
        };
      }));

      return {
        id: mission.id,
        name: mission.name,
        content: mission.content,
        mission_type: mission.mission_type,
        start_at: mission.start_at,
        end_at: mission.end_at,
        exp_reward: mission.exp_reward,
        ability_reward: mission.ability_reward,
        progress,
        total_required: totalRequired,
        is_completed: isCompleted,
        completed_at: completedAt,
        shrines: shrinesWithProgress,
        dieties: dietiesWithProgress,
        titles: mission.mission_titles.map(mt => ({
          id: mt.title.id,
          name: mt.title.name_template,
          description: mt.title.description
        }))
      };
    }));

    res.json(missionsWithProgress);
  } catch (err) {
    console.error('Error fetching missions:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// イベント一覧取得API
app.get('/api/events', async (req, res) => {
  try {
    const currentDate = getCurrentDate();

    const events = await prisma.eventMaster.findMany({
      where: {
        start_at: { lte: currentDate },
        end_at: { gte: currentDate }
      },
      include: {
        image: {
          select: {
            url_l: true,
            url_m: true,
            url_s: true,
            url_xl: true,
            url_xs: true
          }
        },
        event_missions: {
          include: {
            mission: {
              select: {
                id: true,
                name: true,
                content: true
              }
            }
          }
        }
      }
    });

    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/dieties', async (req, res) => {
  try {
    const dieties = await prisma.diety.findMany({
      select: {
        id: true,
        name: true,
        kana: true,
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
        image_by: true
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
      kana: d.kana,
      count: countMap[d.id] || 0,
      image_id: d.image_id,
      image_url: d.image_url,
      image_url_xs: d.image_url_xs,
      image_url_s: d.image_url_s,
      image_url_m: d.image_url_m,
      image_url_l: d.image_url_l,
      image_url_xl: d.image_url_xl,
      image_by: d.image_by
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching dieties:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/dieties/:id', authenticateJWT, async (req, res) => {
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
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
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

    // 現在のユーザーの図鑑収録日と最終参拝日を取得
    let catalogedAt = null;
    let lastPrayedAt = null;
    const userId = req.user.id; // authenticateJWTミドルウェアで設定されたユーザーIDを使用

    if (userId) {
      const catalog = await prisma.dietyCatalog.findFirst({
        where: {
          user_id: userId,
          diety_id: id
        },
        select: { cataloged_at: true, last_prayed_at: true }
      });

      if (catalog) {
        catalogedAt = catalog.cataloged_at;
        lastPrayedAt = catalog.last_prayed_at;
      }
    }

    if (!diety) {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = {
      ...diety,
      count: totalCount,
      catalogedAt: catalogedAt,
      lastPrayedAt: lastPrayedAt,
      shrines: (diety.shrine_dieties || []).map(sd => sd.shrine)
    };



    res.json(result);
  } catch (err) {
    console.error('Error fetching diety:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 神様画像アップロード（古いAPI - 非推奨）
app.post('/api/dieties/:id/images', authenticateJWT, async (req, res) => {
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
    const yyyymm = getCurrentDate().toISOString().slice(0,7).replace('-', '');
    const folder = path.join(__dirname, '..', '..', 'public', 'images', yyyymm);
    fs.mkdirSync(folder, { recursive: true });
    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const img = await Jimp.read(buffer);
    const sizes = { marker: 64, thumb: 200, large: 800 };
    for (const [key, size] of Object.entries(sizes)) {
      const clone = img.clone().cover(size, size);
      await clone.quality(80).writeAsync(path.join(folder, `diety${dietyId}-u${userId}_s${key}.jpg`));
    }
    await prisma.dietyImage.create({
      data: {
        diety_id: dietyId,
        user_id: userId,
        image_url: `/images/${yyyymm}/diety${dietyId}-u${userId}_sthumb.jpg`,
        voting_month: yyyymm,
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error uploading diety image:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/dieties/:id/images', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  if (isNaN(dietyId) || dietyId <= 0) {
    return res.status(400).json({ error: 'Invalid diety ID' });
  }
  try {
    const month = getCurrentDate().toISOString().slice(0,7).replace('-', '');
    const prev = getCurrentDate();
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

app.post('/api/diety-images/:id/vote', authenticateJWT, async (req, res) => {
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

app.get('/api/logs', authenticateJWT, async (req, res) => {
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

// 型定義
type AuthedUser = { id: number; email?: string; is_admin?: boolean; role?: string };
type AuthedRequest = any & { user?: AuthedUser };

// 共通バリデーション関数
function validateId(id: any): number | null {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 機微情報をマスクするログ関数
function safeLogHeaders(headers) {
  const h = { ...headers };
  if (h.authorization) h.authorization = '***redacted***';
  if (h.cookie) h.cookie = '***redacted***';
  return h;
}

// 管理者専用APIキー認証ミドルウェア
function requireAdminApiKey(req: AuthedRequest, res, next) {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    console.error('ADMIN_API_KEY is not configured');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const providedApiKey = req.headers['x-admin-api-key'];
  if (!providedApiKey || providedApiKey !== adminApiKey) {
    return res.status(403).json({ error: 'Invalid admin API key' });
  }

  next();
}

// 管理権限チェックミドルウェア（JWTトークンベース）
async function requireAdmin(req: AuthedRequest, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // データベースからユーザー情報を取得して管理者権限をチェック
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // 管理者権限を確認できたので、req.userを更新
    req.user = {
      id: user.id,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('管理者権限チェックエラー:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 認証ミドルウェア
function authenticateJWT(req: AuthedRequest, res, next) {
  // 1. JWT認証を優先（両環境共通）
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'dev-secret-key';

    jwt.verify(token, secret, (err, payload) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = payload; // { id, email, is_admin, role? }
      next();
    });
    return;
  }

  // 2. x-user-idヘッダーをフォールバック（両環境共通）
  const userIdFromHeader = req.headers['x-user-id'];
  if (userIdFromHeader) {
    const userId = parseInt(userIdFromHeader as string, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(401).json({ error: '有効なユーザーIDが必要です' });
    }
    req.user = { id: userId, role: 'header' };
    return next();
  }

  // 3. 認証情報が不足
  return res.status(401).json({ error: '認証が必要です。Authorizationヘッダーまたはx-user-idヘッダーを提供してください。' });
}

// 認証関連API

// ユーザー登録
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email } = req.body;

    // バリデーション
    if (!username || !email) {
      return res.status(400).json({ error: 'ユーザー名とメールアドレスは必須です' });
    }

    if (username.length < 2) {
      return res.status(400).json({ error: 'ユーザー名は2文字以上で入力してください' });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { name: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.name === username) {
        return res.status(400).json({ error: 'このユーザー名は既に使用されています' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
      }
    }

    // 認証トークン生成（24時間有効）
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // ユーザー作成（levelフィールドはスキーマのデフォルト値を使用）
    const user = await prisma.user.create({
      data: {
        name: username,
        email: email,
        verification_token: verificationToken,
        verification_token_expires: verificationExpires,
        is_verified: false,
        exp: 0,
        ability_points: 0
      }
    });

    console.log('User created successfully:', user.id);

    // 認証メール送信（失敗してもユーザー作成は成功とする）
    let emailSent = false;
    let emailError = null;

    try {
      console.log('Sending verification email...');
      await sendVerificationEmail(email, verificationToken, user.name);
      emailSent = true;
      console.log('Verification email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // メール送信エラーは記録するが、ユーザー作成は成功とする
    }

    console.log('Registration completed successfully');
    res.json({
      success: true,
      message: emailSent
        ? 'ユーザー登録が完了しました。確認メールをお送りしましたので、メール内のリンクをクリックしてアカウントを有効化してください。'
        : 'ユーザー登録は完了しましたが、確認メールの送信に失敗しました。管理者にお問い合わせください。',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailSent: emailSent
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    // より詳細なエラー情報をログに出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // データベース接続エラーの場合
    if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1017') {
      console.error('Database connection error detected');
      return res.status(500).json({ error: 'データベース接続エラーが発生しました。しばらく時間をおいて再度お試しください。' });
    }

    // Prismaエラーの場合
    if (error.code && error.code.startsWith('P')) {
      console.error('Prisma error detected:', error.code);
      return res.status(500).json({ error: 'データベースエラーが発生しました。' });
    }

    res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

// テストユーザー取得エンドポイント（認証不要、ID:1-10のみ）
app.get('/api/test/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          gte: 1,
          lte: 10
        }
      },
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
    console.error('Error fetching test users:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 開発環境用のテストエンドポイント
if (process.env.NODE_ENV === 'development') {

  // メール送信テスト用HTMLページ
  app.get('/api/test/email', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-email.html'));
  });

  // メール送信テスト用エンドポイント
  app.post('/api/test/send-email', async (req, res) => {
    try {
      const { email, subject, message } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'メールアドレスが必要です' });
      }

      const testMailOptions = {
        from: 'test@localhost',
        to: email,
        subject: subject || 'テストメール - 神社参拝アプリ',
        html: message || '<h2>テストメール</h2><p>これは開発環境でのテストメールです。</p>'
      };

      await transporter.sendMail(testMailOptions);

      res.json({
        success: true,
        message: 'テストメールが送信されました（開発環境ではコンソールに表示されます）'
      });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'テストメールの送信に失敗しました' });
    }
  });
}

// アカウント有効化
app.post('/auth/activate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: '認証トークンが必要です' });
    }

    const user = await prisma.user.findFirst({
      where: {
        verification_token: token,
        verification_token_expires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: '無効または期限切れのトークンです' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true
        // verification_tokenは保持して、パスワード設定時に使用
      }
    });

    res.json({
      success: true,
      message: 'アカウントが正常に有効化されました。パスワードを設定してください。'
    });

  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ error: 'アカウント有効化に失敗しました' });
  }
});

// ログイン
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        type: 'error',
        message: 'メールアドレスとパスワードは必須です',
        error: 'Email and password are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        type: 'error',
        message: 'メールアドレスまたはパスワードが正しくありません',
        error: 'Invalid credentials'
      });
    }

    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        type: 'warn',
        message: 'アカウントが有効化されていません。確認メールをチェックしてください。',
        error: 'Account not verified'
      });
    }

    // パスワードチェック（開発環境では簡易チェック）
    if (process.env.NODE_ENV === 'production') {
      if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({
          success: false,
          type: 'error',
          message: 'メールアドレスまたはパスワードが正しくありません',
          error: 'Invalid credentials'
        });
      }
    } else {
      // 開発環境では任意のパスワードでログイン可能
      if (!password) {
        return res.status(401).json({
          success: false,
          type: 'error',
          message: 'パスワードは必須です',
          error: 'Password is required'
        });
      }
    }

    // JWTトークン生成
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        type: 'fatal',
        message: 'サーバー設定エラーが発生しました',
        error: 'Server misconfigured'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      secret,
      { expiresIn: '24h', issuer: 'maherama-app' }
    );

    res.json({
      success: true,
      type: 'success',
      message: 'ログインが完了しました',
      data: {
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          level: user.level,
          exp: user.exp,
          ability_points: user.ability_points
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      type: 'fatal',
      message: 'ログイン処理中にエラーが発生しました',
      error: 'Login failed'
    });
  }
});

// テストユーザーログイン（開発環境のみ）
app.post('/auth/test-login', async (req, res) => {
  try {
    // 本番環境では無効化
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        type: 'error',
        message: 'テストログインは本番環境では利用できません',
        error: 'Test login not available in production'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        type: 'error',
        message: 'ユーザーIDは必須です',
        error: 'User ID is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        type: 'error',
        message: '指定されたユーザーが見つかりません',
        error: 'User not found'
      });
    }

    // JWTトークン生成
    const secret = process.env.JWT_SECRET || 'dev-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      secret,
      { expiresIn: '24h', issuer: 'maherama-app' }
    );

    res.json({
      success: true,
      type: 'success',
      message: 'テストログインが完了しました',
      data: {
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          level: user.level,
          exp: user.exp,
          ability_points: user.ability_points
        }
      }
    });

  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({
      success: false,
      type: 'fatal',
      message: 'テストログイン処理中にエラーが発生しました',
      error: 'Test login failed'
    });
  }
});

// パスワードリセット要求
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'メールアドレスは必須です' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
      return res.json({
        success: true,
        message: 'パスワードリセット用のメールをお送りしました。'
      });
    }

    const resetToken = generateToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1時間

    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires
      }
    });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Password reset email sending failed:', emailError);
      return res.status(500).json({ error: 'メール送信に失敗しました' });
    }

    res.json({
      success: true,
      message: 'パスワードリセット用のメールをお送りしました。'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'パスワードリセットに失敗しました' });
  }
});

// パスワードリセット確認
app.post('/auth/reset-password-confirm', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'トークンとパスワードは必須です' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
    }

    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: '無効または期限切れのトークンです' });
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null
      }
    });

    res.json({
      success: true,
      message: 'パスワードが正常に更新されました。新しいパスワードでログインしてください。'
    });

  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ error: 'パスワード更新に失敗しました' });
  }
});

// アクティベーション後のパスワード設定
app.post('/auth/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'トークンとパスワードは必須です' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
    }

    const user = await prisma.user.findFirst({
      where: {
        verification_token: token,
        verification_token_expires: { gt: new Date() },
        is_verified: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: '無効なトークンです' });
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        verification_token: null,
        verification_token_expires: null
      }
    });

    res.json({
      success: true,
      message: 'パスワードが正常に設定されました。ログインしてください。'
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'パスワード設定に失敗しました' });
  }
});

// 全ユーザー取得API（認証必要）
app.get('/api/users', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id/shrine-rankings', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id/diety-rankings-bundle', authenticateJWT, async (req, res) => {
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

app.get('/api/users/me/subscription', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await getUserSubscription(userId);
    // 後方互換性のため、最初のサブスクリプションのslotsを返す（デフォルト0）
    const slots = subscription.subscriptions.length > 0 ? 1 : 0; // 簡易的なslots計算
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// 課金ランク変更API（Stripe秒割り対応）
app.post('/api/users/me/subscription/change-plan', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
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
        expires_at: { gt: getCurrentDate() }
      },
      orderBy: { created_at: 'desc' }
    });

    const now = getCurrentDate();

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
          subscription_type: 'range_multiplier',
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
          subscription_type: 'range_multiplier',
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
app.post('/api/subscription/create-checkout-session', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
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
app.get('/api/users/:id/rankings', authenticateJWT, async (req, res) => {
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
app.get('/api/shrine-rankings-bundle', authenticateJWT, async (req, res) => {
  const periods = ['all', 'yearly', 'monthly', 'weekly'];
  const result = {};
  for (const period of periods) {
    const rankings = await getShrineRankings(period); // 既存のランキング取得ロジックを流用
    result[period] = rankings;
  }
  res.json(result);
});

app.get('/api/diety-rankings-bundle', authenticateJWT, async (req, res) => {
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

// ユーザーランキング取得API（単一期間）
app.get('/api/user-rankings', authenticateJWT, async (req, res) => {
  const period = req.query.period || 'all';
  try {
    const rankings = await getUserRankings(period);
    res.json(rankings);
  } catch (error) {
    console.error('ユーザーランキング取得エラー:', error);
    res.status(500).json({ error: 'ランキング取得失敗' });
  }
});

// ユーザーランキング取得API（年次）
app.get('/api/user-rankings-yearly', authenticateJWT, async (req, res) => {
  try {
    const rankings = await getUserRankings('yearly');
    res.json(rankings);
  } catch (error) {
    console.error('ユーザーランキング取得エラー:', error);
    res.status(500).json({ error: 'ランキング取得失敗' });
  }
});

// ユーザーランキング取得API（月次）
app.get('/api/user-rankings-monthly', authenticateJWT, async (req, res) => {
  try {
    const rankings = await getUserRankings('monthly');
    res.json(rankings);
  } catch (error) {
    console.error('ユーザーランキング取得エラー:', error);
    res.status(500).json({ error: 'ランキング取得失敗' });
  }
});

// ユーザーランキング取得API（週次）
app.get('/api/user-rankings-weekly', authenticateJWT, async (req, res) => {
  try {
    const rankings = await getUserRankings('weekly');
    res.json(rankings);
  } catch (error) {
    console.error('ユーザーランキング取得エラー:', error);
    res.status(500).json({ error: 'ランキング取得失敗' });
  }
});

app.get('/api/user-rankings-bundle', authenticateJWT, async (req, res) => {
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
app.get('/api/shrines/:id/rankings-bundle', authenticateJWT, async (req, res) => {
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
app.get('/api/users/me/shrines-visited', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    const stats = await prisma.shrinePrayStats.findMany({
      where: { user_id: userId },
      include: {
        shrine: {
          select: {
            id: true,
            name: true,
            kana: true,
            image_url: true,
            image_url_xs: true,
            image_url_s: true,
            image_url_m: true,
            image_url_l: true,
            image_url_xl: true
          }
        }
      },
      orderBy: { count: 'desc' },
    });

    // ShrineCatalog から last_prayed_at と cataloged_at を取得
    const catalogs = await prisma.shrineCatalog.findMany({
      where: { user_id: userId },
      select: { shrine_id: true, last_prayed_at: true, cataloged_at: true }
    });
    const lastPrayedMap = Object.fromEntries(catalogs.map(b => [b.shrine_id, b.last_prayed_at]));
    const catalogedAtMap = Object.fromEntries(catalogs.map(b => [b.shrine_id, b.cataloged_at]));

    const result = stats.map(s => {
      return {
        id: s.shrine.id,
        name: s.shrine.name,
        kana: s.shrine.kana,
        count: s.count,
        catalogedAt: catalogedAtMap[s.shrine.id] || null, // 図鑑収録日
        lastPrayedAt: lastPrayedMap[s.shrine.id] || null,
        image_url: s.shrine.image_url_m || null,
        image_url_s: s.shrine.image_url_s || null,
        image_url_m: s.shrine.image_url_m || null,
        image_url_l: s.shrine.image_url_l || null,
        image_url_xl: s.shrine.image_url_xl || null,
        image_url_xs: s.shrine.image_url_xs || null
      };
    });



    res.json(result);
  } catch (err) {
    console.error('Error fetching user shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/users/:id/shrines-visited', authenticateJWT, async (req, res) => {
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
      count: s.count
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user shrines:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 現在のユーザーの参拝した神様一覧
app.get('/api/users/me/dieties-visited', authenticateJWT, async (req, res) => {
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
    // Dietyテーブルから神様情報を取得（画像URLも含む）
    const dieties = await prisma.diety.findMany({
      where: { id: { in: dietyIds } },
      select: {
        id: true,
        name: true,
        kana: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true
      }
    });
    // DietyCatalog から last_prayed_at と cataloged_at を取得
    const catalogs = await prisma.dietyCatalog.findMany({
      where: { user_id: userId },
      select: { diety_id: true, last_prayed_at: true, cataloged_at: true }
    });
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
        catalogedAt: catalogedAtMap[diety.id] || null, // 図鑑収録日
        lastPrayedAt: lastPrayedMap[diety.id] || null,
        image_url: diety.image_url_m || null,
        image_url_s: diety.image_url_s || null,
        image_url_m: diety.image_url_m || null,
        image_url_l: diety.image_url_l || null,
        image_url_xl: diety.image_url_xl || null,
        image_url_xs: diety.image_url_xs || null
      };
    }).filter(Boolean);




    res.json(result);
  } catch (err) {
    console.error('Error fetching user dieties:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/users/:id/dieties-visited', authenticateJWT, async (req, res) => {
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

      };
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    console.error('Error fetching user dieties:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/users/:id/titles', authenticateJWT, async (req, res) => {
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
app.get('/api/abilities', authenticateJWT, async (req, res) => {
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
app.post('/api/abilities/:id/acquire', authenticateJWT, async (req, res) => {
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
app.post('/api/user/reset-abilities', authenticateJWT, async (req, res) => {
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
        expires_at: { gt: getCurrentDate() }
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
app.get('/api/users/:id/level-info', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id/abilities', authenticateJWT, async (req, res) => {
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
app.post('/api/abilities/:id/purchase', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id/worship-limit', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id/pray-distance', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id/subscription', authenticateJWT, async (req, res) => {
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
app.get('/api/users/:id', authenticateJWT, async (req, res) => {
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
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
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
      image_url_xs: user.image_url_xs,
      image_url_s: user.image_url_s,
      image_url_m: user.image_url_m,
      image_url_l: user.image_url_l,
      image_url_xl: user.image_url_xl,
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
app.get('/api/users/:id/following', authenticateJWT, async (req, res) => {
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
            image_url_xs: true,
            image_url_s: true,
            image_url_m: true,
            image_url_l: true,
            image_url_xl: true,
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
      image_url_xs: f.following.image_url_xs,
      image_url_s: f.following.image_url_s,
      image_url_m: f.following.image_url_m,
      image_url_l: f.following.image_url_l,
      image_url_xl: f.following.image_url_xl,
      image_by: f.following.image_by
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching following:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// フォロワー一覧取得
app.get('/api/users/:id/followers', authenticateJWT, async (req, res) => {
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
            image_url_xs: true,
            image_url_s: true,
            image_url_m: true,
            image_url_l: true,
            image_url_xl: true,
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
      image_url_xs: f.follower.image_url_xs,
      image_url_s: f.follower.image_url_s,
      image_url_m: f.follower.image_url_m,
      image_url_l: f.follower.image_url_l,
      image_url_xl: f.follower.image_url_xl,
      image_by: f.follower.image_by
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// フォロー/アンフォロー
app.post('/api/follows', authenticateJWT, async (req, res) => {
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

app.delete('/api/follows', authenticateJWT, async (req, res) => {
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

app.get('/api/users/:id/abilities', authenticateJWT, async (req, res) => {
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

// Stripeで能力初期化用Checkoutセッション作成API
app.post('/api/subscription/reset-abilities/checkout', authenticateJWT, async (req, res) => {
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
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
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
        const now = getCurrentDate();
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
app.get('/api/shrines/:id/marker-status', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const userId = req.user.id;

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
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
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
  thumbnail: 112,
  original: 1024
};

// ファイル名生成
function getImageFileName(type, id, userId, size, ext = 'jpg') {
  return `${type}${id}-u${userId}_s${size}.${ext}`;
}

// yyyyMM取得
function getYYYYMM() {
  const now = getCurrentDate();
  return `${now.getFullYear()}${('0' + (now.getMonth() + 1)).slice(-2)}`;
}

// 共通画像アップロード処理
async function handleImageUpload(type, id, userId, fileBuffer) {
  const yyyymm = getYYYYMM();
  const dir = path.join(__dirname, '..', 'public', 'images', yyyymm);
  ensureDirSync(dir);

  // 6サイズ保存
  const markerPath = path.join(dir, getImageFileName(type, id, userId, 'marker'));
  const origPath = path.join(dir, getImageFileName(type, id, userId, 'original'));
  const size112Path = path.join(dir, getImageFileName(type, id, userId, '112'));
  const size256Path = path.join(dir, getImageFileName(type, id, userId, '256'));
  const size512Path = path.join(dir, getImageFileName(type, id, userId, '512'));
  const size1024Path = path.join(dir, getImageFileName(type, id, userId, '1024'));

  await sharp(fileBuffer).resize(64, 64).jpeg({ quality: 90 }).toFile(markerPath);
  await sharp(fileBuffer).resize(112, 112).jpeg({ quality: 90 }).toFile(size112Path);
  await sharp(fileBuffer).resize(256, 256).jpeg({ quality: 90 }).toFile(size256Path);
  await sharp(fileBuffer).resize(512, 512).jpeg({ quality: 90 }).toFile(size512Path);
  await sharp(fileBuffer).resize(1024, 1024).jpeg({ quality: 90 }).toFile(size1024Path);
  await sharp(fileBuffer).resize(sizes.original, sizes.original, { fit: 'inside' }).jpeg({ quality: 90 }).toFile(origPath);

  // URL生成
  const originalUrl = `/images/${yyyymm}/${getImageFileName(type, id, userId, 'original')}`;
  const urlXs = `/images/${yyyymm}/${getImageFileName(type, id, userId, 'marker')}`;
  const urlS = `/images/${yyyymm}/${getImageFileName(type, id, userId, '112')}`;
  const urlM = `/images/${yyyymm}/${getImageFileName(type, id, userId, '256')}`;
  const urlL = `/images/${yyyymm}/${getImageFileName(type, id, userId, '512')}`;
  const urlXl = `/images/${yyyymm}/${getImageFileName(type, id, userId, '1024')}`;

  return {
    originalUrl,
    urlXs,
    urlS,
    urlM,
    urlL,
    urlXl,
    votingMonth: yyyymm
  };
}

// Shrine画像アップロードAPI
app.post('/api/shrines/:id/images/upload', authenticateJWT, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ファイルサイズが5MBを超えています' });
      }
      return res.status(400).json({ error: 'ファイルアップロードエラー: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const userId = req.user.id;



  if (isNaN(shrineId) || !req.file) {
    return res.status(400).json({ error: 'IDまたは画像が不正です' });
  }
  try {
    // 共通画像アップロード処理
    const imageData = await handleImageUpload('shrine', shrineId, userId, req.file.buffer);

    // ユーザー情報取得
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Imageテーブルに登録
    const image = await prisma.image.create({
      data: {
        original_url: imageData.originalUrl,
        url_xs: imageData.urlXs,
        url_s: imageData.urlS,
        url_m: imageData.urlM,
        url_l: imageData.urlL,
        url_xl: imageData.urlXl,
        uploaded_by: user?.name || '不明'
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
        voting_month: imageData.votingMonth,
        is_current_thumbnail: !currentThumbnail // サムネイルがない場合は即採用
      }
    });

    // サムネイルがない場合は神社テーブルも更新
    if (!currentThumbnail) {
      await prisma.shrine.update({
        where: { id: shrineId },
        data: {
          image_id: image.id,
          image_url: imageData.urlM,
          image_url_xs: imageData.urlXs,
          image_url_s: imageData.urlS,
          image_url_m: imageData.urlM,
          image_url_l: imageData.urlL,
          image_url_xl: imageData.urlXl,
          image_by: user?.name || '不明'
        }
      });
    }

    const message = !currentThumbnail
    ? '画像がアップロードされ、サムネイルとして採用されました。'
    : '画像がアップロードされ、翌月の投票対象としてエントリーされました。';

    res.json({
      success: true,
      type: 'success',
      message: message,
      image: { ...newImage, ...image },
      isCurrentThumbnail: !currentThumbnail
    });
  } catch (err) {
    console.error('Shrine画像アップロード失敗:', err);
    res.status(500).json({
      success: false,
      type: 'error',
      message: '画像アップロード失敗',
      error: '画像アップロード失敗'
    });
  }
});

// Diety画像アップロードAPI（複数形エンドポイント）
app.post('/api/dietys/:id/images/upload', authenticateJWT, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ファイルサイズが5MBを超えています' });
      }
      return res.status(400).json({ error: 'ファイルアップロードエラー: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const userId = req.user.id;



  if (isNaN(dietyId) || !req.file) {
    return res.status(400).json({ error: 'IDまたは画像が不正です' });
  }
  try {
    // 共通画像アップロード処理
    const imageData = await handleImageUpload('diety', dietyId, userId, req.file.buffer);

    // ユーザー情報取得
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Imageテーブルに登録
    const image = await prisma.image.create({
      data: {
        original_url: imageData.originalUrl,
        url_xs: imageData.urlXs,
        url_s: imageData.urlS,
        url_m: imageData.urlM,
        url_l: imageData.urlL,
        url_xl: imageData.urlXl,
        uploaded_by: user?.name || '不明'
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
        voting_month: imageData.votingMonth,
        is_current_thumbnail: !currentThumbnail // サムネイルがない場合は即採用
      }
    });

    // サムネイルがない場合は神様テーブルも更新
    if (!currentThumbnail) {
      await prisma.diety.update({
        where: { id: dietyId },
        data: {
          image_id: image.id,
          image_url: imageData.urlM,
          image_url_xs: imageData.urlXs,
          image_url_s: imageData.urlS,
          image_url_m: imageData.urlM,
          image_url_l: imageData.urlL,
          image_url_xl: imageData.urlXl,
          image_by: user?.name || '不明'
        }
      });
    }

    const message = !currentThumbnail
    ? '画像がアップロードされ、サムネイルとして採用されました。'
    : '画像がアップロードされ、翌月の投票対象としてエントリーされました。';

    res.json({
      success: true,
      type: 'success',
      message: message,
      image: { ...newImage, ...image },
      isCurrentThumbnail: !currentThumbnail
    });
  } catch (err) {
    console.error('Diety画像アップロード失敗:', err);
    res.status(500).json({
      success: false,
      type: 'error',
      message: '画像アップロード失敗',
      error: '画像アップロード失敗'
    });
  }
});

// Diety画像アップロードAPI（単数形エンドポイント - 後方互換性）
app.post('/api/dieties/:id/images/upload', authenticateJWT, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ファイルサイズが5MBを超えています' });
      }
      return res.status(400).json({ error: 'ファイルアップロードエラー: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const userId = req.user.id;



  if (isNaN(dietyId) || !req.file) {
    return res.status(400).json({ error: 'IDまたは画像が不正です' });
  }
  try {
    // 共通画像アップロード処理
    const imageData = await handleImageUpload('diety', dietyId, userId, req.file.buffer);

    // ユーザー情報取得
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Imageテーブルに登録
    const image = await prisma.image.create({
      data: {
        original_url: imageData.originalUrl,
        url_xs: imageData.urlXs,
        url_s: imageData.urlS,
        url_m: imageData.urlM,
        url_l: imageData.urlL,
        url_xl: imageData.urlXl,
        uploaded_by: user?.name || '不明'
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
        voting_month: imageData.votingMonth,
        is_current_thumbnail: !currentThumbnail // サムネイルがない場合は即採用
      }
    });

    // サムネイルがない場合は神様テーブルも更新
    if (!currentThumbnail) {
      await prisma.diety.update({
        where: { id: dietyId },
        data: {
          image_id: image.id,
          image_url: imageData.urlM,
          image_url_xs: imageData.urlXs,
          image_url_s: imageData.urlS,
          image_url_m: imageData.urlM,
          image_url_l: imageData.urlL,
          image_url_xl: imageData.urlXl,
          image_by: user?.name || '不明'
        }
      });
    }

    const message = !currentThumbnail
      ? '画像がアップロードされ、サムネイルとして採用されました。'
      : '画像がアップロードされ、翌月の投票対象としてエントリーされました。';

    res.json({
      success: true,
      type: 'success',
      message: message,
      image: { ...newImage, ...image },
      isCurrentThumbnail: !currentThumbnail
    });
  } catch (err) {
    console.error('Diety画像アップロード失敗:', err);
    res.status(500).json({
      success: false,
      type: 'error',
      message: '画像アップロード失敗',
      error: '画像アップロード失敗'
    });
  }
});

// ユーザー画像アップロードAPI
app.post('/api/users/:id/images/upload', authenticateJWT, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ファイルサイズが5MBを超えています' });
      }
      return res.status(400).json({ error: 'ファイルアップロードエラー: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const authenticatedUserId = req.user.id;

  // 自分の画像のみアップロード可能
  if (userId !== authenticatedUserId) {
    return res.status(403).json({ error: '自分の画像のみアップロード可能です' });
  }

  if (isNaN(userId) || !req.file) {
    return res.status(400).json({ error: 'IDまたは画像が不正です' });
  }

  try {
    const yyyymm = getYYYYMM();
    const dir = path.join(__dirname, '..', 'public', 'images', yyyymm);
    ensureDirSync(dir);

    // ユーザー画像用のサイズ設定
    const sizes = {
      marker: 64,
      thumbnail: 200,
      original: 800
    };

    // 6サイズ保存
    const markerPath = path.join(dir, getImageFileName('user', userId, userId, 'marker'));
    const thumbPath = path.join(dir, getImageFileName('user', userId, userId, 'thumbnail'));
    const origPath = path.join(dir, getImageFileName('user', userId, userId, 'original'));
    const size112Path = path.join(dir, getImageFileName('user', userId, userId, '112'));
    const size256Path = path.join(dir, getImageFileName('user', userId, userId, '256'));
    const size512Path = path.join(dir, getImageFileName('user', userId, userId, '512'));
    const size1024Path = path.join(dir, getImageFileName('user', userId, userId, '1024'));

    await sharp(req.file.buffer).resize(64, 64).jpeg({ quality: 90 }).toFile(markerPath);
    await sharp(req.file.buffer).resize(112, 112).jpeg({ quality: 90 }).toFile(size112Path);
    await sharp(req.file.buffer).resize(256, 256).jpeg({ quality: 90 }).toFile(size256Path);
    await sharp(req.file.buffer).resize(512, 512).jpeg({ quality: 90 }).toFile(size512Path);
    await sharp(req.file.buffer).resize(1024, 1024).jpeg({ quality: 90 }).toFile(size1024Path);
    await sharp(req.file.buffer).resize(sizes.original, sizes.original, { fit: 'inside' }).jpeg({ quality: 90 }).toFile(origPath);

    // URL生成
    const originalUrl = `/images/${yyyymm}/${getImageFileName('user', userId, userId, 'original')}`;
    const urlXs = `/images/${yyyymm}/${getImageFileName('user', userId, userId, 'marker')}`;
    const urlS = `/images/${yyyymm}/${getImageFileName('user', userId, userId, '112')}`;
    const urlM = `/images/${yyyymm}/${getImageFileName('user', userId, userId, '256')}`;
    const urlL = `/images/${yyyymm}/${getImageFileName('user', userId, userId, '512')}`;
    const urlXl = `/images/${yyyymm}/${getImageFileName('user', userId, userId, '1024')}`;

    // ユーザー情報取得
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Imageテーブルに登録
    const image = await prisma.image.create({
      data: {
        original_url: originalUrl,
        url_xs: urlXs,
        url_s: urlS,
        url_m: urlM,
        url_l: urlL,
        url_xl: urlXl,
        uploaded_by: user?.name || '不明'
      }
    });

    // ユーザーテーブルを更新
    await prisma.user.update({
      where: { id: userId },
      data: {
        image_id: image.id,
        image_url: urlM,
        image_url_xs: urlXs,
        image_url_s: urlS,
        image_url_m: urlM,
        image_url_l: urlL,
        image_url_xl: urlXl,
        image_by: user?.name || '不明'
      }
    });

    res.json({
      success: true,
      type: 'success',
      message: 'プロフィール画像が更新されました。',
      image: image,
      isCurrentThumbnail: true
    });
  } catch (err) {
    console.error('ユーザー画像アップロード失敗:', err);
    res.status(500).json({
      success: false,
      type: 'error',
      message: '画像アップロード失敗',
      error: '画像アップロード失敗'
    });
  }
});

// 個別ユーザーの画像情報のみを取得するAPI
app.get('/api/users/:id/image', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        image_id: true,
        image_url: true,
        image_url_xs: true,
        image_url_s: true,
        image_url_m: true,
        image_url_l: true,
        image_url_xl: true,
        image_by: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user image:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 画像リスト取得API（神社）
app.get('/api/shrines/:id/images', authenticateJWT, async (req, res) => {
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
app.get('/api/dieties/:id/images', authenticateJWT, async (req, res) => {
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
app.post('/api/shrines/:shrineId/images/:imageId/vote', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.shrineId, 10);
  const imageId = parseInt(req.params.imageId, 10);
  const userId = req.user.id;
  if (isNaN(shrineId) || isNaN(imageId)) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: '無効なIDです',
      error: 'Invalid ID'
    });
  }

  try {
    // 投票権チェック（図鑑登録済みユーザーのみ）
    const hasCatalog = await prisma.shrineCatalog.findUnique({ where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } } });
    if (!hasCatalog) {
      return res.status(403).json({
        success: false,
        type: 'warn',
        message: '投票権がありません（参拝履歴なし）',
        error: 'No voting rights'
      });
    }

    // 既存投票削除（1ユーザー1票）
    await prisma.imageVote.deleteMany({ where: { user_id: userId, shrine_image_id: imageId } });
    // 投票
    await prisma.imageVote.create({ data: { user_id: userId, shrine_image_id: imageId } });

    // 投票結果に基づいてサムネイル更新をチェック
    await updateShrineThumbnailFromVotes(shrineId);

    res.json({
      success: true,
      type: 'success',
      message: '投票が完了しました',
      data: { success: true }
    });
  } catch (err) {
    console.error('神社画像投票失敗:', err);
    res.status(500).json({
      success: false,
      type: 'fatal',
      message: '投票処理中にエラーが発生しました',
      error: '投票失敗'
    });
  }
});

// 投票API（神様画像）
app.post('/api/dieties/:dietyId/images/:imageId/vote', authenticateJWT, async (req, res) => {
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

// 旅の記録取得API（神社）
app.get('/api/shrines/:id/travel-logs', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  if (isNaN(shrineId)) return res.status(400).json({ error: 'Invalid shrine ID' });

  try {
    const logs = await prisma.shrineTravelLog.findMany({
      where: { shrine_id: shrineId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.shrineTravelLog.count({
      where: { shrine_id: shrineId }
    });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total
      }
    });
  } catch (err) {
    console.error('神社旅の記録取得失敗:', err);
    res.status(500).json({ error: '旅の記録取得失敗' });
  }
});

// 神社の旅の記録投稿可能状況取得API
app.get('/api/shrines/:id/travel-logs/can-post', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  if (isNaN(shrineId)) return res.status(400).json({ error: 'Invalid shrine ID' });

  try {
    // 図鑑登録チェック
    const hasCatalog = await prisma.shrineCatalog.findUnique({
      where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } }
    });

    if (!hasCatalog) {
      return res.json({
        canPost: false,
        reason: '図鑑に登録されていません'
      });
    }

    // 参拝数を取得
    const prayCount = await prisma.shrinePray.count({
      where: { user_id: userId, shrine_id: shrineId }
    });

    // 既に投稿した旅の記録数を取得
    const postedLogCount = await prisma.shrineTravelLog.count({
      where: { user_id: userId, shrine_id: shrineId }
    });

    const canPost = postedLogCount < prayCount;
    const remainingPosts = Math.max(0, prayCount - postedLogCount);

    res.json({
      canPost,
      prayCount,
      postedLogCount,
      remainingPosts,
      reason: canPost ? null : `参拝数(${prayCount}回)までしか旅の記録を投稿できません。既に${postedLogCount}回投稿済みです。`
    });
  } catch (err) {
    console.error('神社旅の記録投稿可能状況取得失敗:', err);
    res.status(500).json({ error: '投稿可能状況取得失敗' });
  }
});

// 旅の記録投稿API（神社）
app.post('/api/shrines/:id/travel-logs', authenticateJWT, async (req, res) => {
  const shrineId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { content } = req.body;

  if (isNaN(shrineId)) return res.status(400).json({ error: 'Invalid shrine ID' });
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });
  if (content.length > 1000) return res.status(400).json({ error: 'Content must be 1000 characters or less' });

  try {
    // 図鑑登録チェック
    const hasCatalog = await prisma.shrineCatalog.findUnique({
      where: { user_id_shrine_id: { user_id: userId, shrine_id: shrineId } }
    });
    if (!hasCatalog) return res.status(403).json({ error: '図鑑に登録されていません' });

    // 参拝数を取得
    const prayCount = await prisma.shrinePray.count({
      where: { user_id: userId, shrine_id: shrineId }
    });

    // 既に投稿した旅の記録数を取得
    const postedLogCount = await prisma.shrineTravelLog.count({
      where: { user_id: userId, shrine_id: shrineId }
    });

    // 参拝数までしか投稿できない
    if (postedLogCount >= prayCount) {
      return res.status(409).json({
        error: `参拝数(${prayCount}回)までしか旅の記録を投稿できません。既に${postedLogCount}回投稿済みです。`
      });
    }

    // 旅の記録作成
    const log = await prisma.shrineTravelLog.create({
      data: {
        user_id: userId,
        shrine_id: shrineId,
        content
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    res.json(log);
  } catch (err) {
    console.error('神社旅の記録投稿失敗:', err);
    res.status(500).json({ error: '旅の記録投稿失敗' });
  }
});

// 旅の記録取得API（神様）
app.get('/api/dieties/:id/travel-logs', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  if (isNaN(dietyId)) return res.status(400).json({ error: 'Invalid diety ID' });

  try {
    const logs = await prisma.dietyTravelLog.findMany({
      where: { diety_id: dietyId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.dietyTravelLog.count({
      where: { diety_id: dietyId }
    });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total
      }
    });
  } catch (err) {
    console.error('神様旅の記録取得失敗:', err);
    res.status(500).json({ error: '旅の記録取得失敗' });
  }
});

// 神様の旅の記録投稿可能状況取得API
app.get('/api/dieties/:id/travel-logs/can-post', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  if (isNaN(dietyId)) return res.status(400).json({ error: 'Invalid diety ID' });

  try {
    // 図鑑登録チェック
    const hasCatalog = await prisma.dietyCatalog.findUnique({
      where: { user_id_diety_id: { user_id: userId, diety_id: dietyId } }
    });

    if (!hasCatalog) {
      return res.json({
        canPost: false,
        reason: '図鑑に登録されていません'
      });
    }

    // 参拝数を取得
    const prayCount = await prisma.dietyPray.count({
      where: { user_id: userId, diety_id: dietyId }
    });

    // 既に投稿した旅の記録数を取得
    const postedLogCount = await prisma.dietyTravelLog.count({
      where: { user_id: userId, diety_id: dietyId }
    });

    const canPost = postedLogCount < prayCount;
    const remainingPosts = Math.max(0, prayCount - postedLogCount);

    res.json({
      canPost,
      prayCount,
      postedLogCount,
      remainingPosts,
      reason: canPost ? null : `参拝数(${prayCount}回)までしか旅の記録を投稿できません。既に${postedLogCount}回投稿済みです。`
    });
  } catch (err) {
    console.error('神様旅の記録投稿可能状況取得失敗:', err);
    res.status(500).json({ error: '投稿可能状況取得失敗' });
  }
});

// 旅の記録投稿API（神様）
app.post('/api/dieties/:id/travel-logs', authenticateJWT, async (req, res) => {
  const dietyId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { content } = req.body;

  if (isNaN(dietyId)) return res.status(400).json({ error: 'Invalid diety ID' });
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });
  if (content.length > 1000) return res.status(400).json({ error: 'Content must be 1000 characters or less' });

  try {
    // 図鑑登録チェック
    const hasCatalog = await prisma.dietyCatalog.findUnique({
      where: { user_id_diety_id: { user_id: userId, diety_id: dietyId } }
    });
    if (!hasCatalog) return res.status(403).json({ error: '図鑑に登録されていません' });

    // 参拝数を取得
    const prayCount = await prisma.dietyPray.count({
      where: { user_id: userId, diety_id: dietyId }
    });

    // 既に投稿した旅の記録数を取得
    const postedLogCount = await prisma.dietyTravelLog.count({
      where: { user_id: userId, diety_id: dietyId }
    });

    // 参拝数までしか投稿できない
    if (postedLogCount >= prayCount) {
      return res.status(409).json({
        error: `参拝数(${prayCount}回)までしか旅の記録を投稿できません。既に${postedLogCount}回投稿済みです。`
      });
    }

    // 旅の記録作成
    const log = await prisma.dietyTravelLog.create({
      data: {
        user_id: userId,
        diety_id: dietyId,
        content
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    res.json(log);
  } catch (err) {
    console.error('神様旅の記録投稿失敗:', err);
    res.status(500).json({ error: '旅の記録投稿失敗' });
  }
});

// 投票・審査期間設定取得API
app.get('/api/voting/settings', async (req, res) => {
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
  const now = getCurrentDate();
  const y = now.getFullYear();
  const m = ('0' + (now.getMonth() + 1)).slice(-2);
  const d = ('0' + now.getDate()).slice(-2);
  return path.join(LOG_DIR, `backend-${y}${m}${d}.log`);
}
function appendLogToFile(level, ...args) {
  const msg = `[${getCurrentDate().toISOString()}][${level}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n';
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
      const expReward = expRewardsModule.EXP_REWARDS.WEEKLY_RANKING; // 週間は100EXP

      // 経験値を付与
      const expResult = await expSystemModule.addExperience(prisma, topShrine.user.id, expReward, 'WEEKLY_RANKING');

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
      const expReward = expRewardsModule.EXP_REWARDS.WEEKLY_RANKING; // 週間は100EXP

      // 経験値を付与
      const expResult = await expSystemModule.addExperience(prisma, topDiety.user.id, expReward, 'WEEKLY_RANKING');

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

      for (let i = 0; i < topStats.length; i++) {
        const stat = topStats[i];
        const rank = i + 1;

        // ランクに応じた称号コードを生成
        let titleCode;
        if (period === 'yearly') {
          if (rank === 1) titleCode = 'yearly_rank_shrine_1st';
          else if (rank === 2) titleCode = 'yearly_rank_shrine_2nd';
          else if (rank === 3) titleCode = 'yearly_rank_shrine_3rd';
          else titleCode = 'yearly_rank_shrine_1st'; // フォールバック
        } else {
          if (rank === 1) titleCode = 'monthly_rank_shrine_1st';
          else if (rank === 2) titleCode = 'monthly_rank_shrine_2nd';
          else if (rank === 3) titleCode = 'monthly_rank_shrine_3rd';
          else titleCode = 'monthly_rank_shrine_1st'; // フォールバック
        }
        const titleMaster = await prisma.titleMaster.findUnique({ where: { code: titleCode } });

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

        // ランクに応じたグレードを設定
        let grade;
        if (rank === 1) grade = 5; // 1位は金
        else if (rank === 2) grade = 4; // 2位は銀
        else if (rank === 3) grade = 2; // 3位は銅
        else grade = 1; // その他

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
              awarded_at: getCurrentDate(),
              grade: grade,
              display_name: displayName
            }
          });
        } else {
          // 新しい称号を作成
          await prisma.userTitle.create({
            data: {
              user_id: stat.user.id,
              title_id: titleMaster.id,
              awarded_at: getCurrentDate(),
              embed_data: embedData,
              grade: grade,
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
        const expResult = await expSystemModule.addExperience(prisma, stat.user.id, expReward, 'TITLE_ACQUISITION');
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
      // その神様の上位3件を取得
      const topStats = await dietyModel.findMany({
        where: { diety_id: diety.id },
        orderBy: { count: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true } } }
      });

      if (topStats.length === 0) continue;

      for (let i = 0; i < topStats.length; i++) {
        const stat = topStats[i];
        const rank = i + 1;

        // ランクに応じた称号コードを生成
        let titleCode;
        if (period === 'yearly') {
          if (rank === 1) titleCode = 'yearly_rank_diety_1st';
          else if (rank === 2) titleCode = 'yearly_rank_diety_2nd';
          else if (rank === 3) titleCode = 'yearly_rank_diety_3rd';
          else titleCode = 'yearly_rank_diety_1st'; // フォールバック
        } else {
          if (rank === 1) titleCode = 'monthly_rank_diety_1st';
          else if (rank === 2) titleCode = 'monthly_rank_diety_2nd';
          else if (rank === 3) titleCode = 'monthly_rank_diety_3rd';
          else titleCode = 'monthly_rank_diety_1st'; // フォールバック
        }
        const titleMaster = await prisma.titleMaster.findUnique({ where: { code: titleCode } });

        if (!titleMaster) {
          console.log(`❌ 称号マスターが見つかりません: ${titleCode}`);
          continue;
        }

        // 表示名を生成
        let displayName = titleMaster.name_template;
        const embedData = {
          diety: diety.name,
          diety_id: diety.id,
          rank: rank + '位',
          period: periodText,
        };
        for (const key of Object.keys(embedData)) {
          displayName = displayName.replace(new RegExp(`<\{${key}\}>`, 'g'), embedData[key]);
        }

        // ランクに応じたグレードを設定
        let grade;
        if (rank === 1) grade = 5; // 1位は金
        else if (rank === 2) grade = 4; // 2位は銀
        else if (rank === 3) grade = 2; // 3位は銅
        else grade = 1; // その他

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
              awarded_at: getCurrentDate(),
              grade: grade,
              display_name: displayName
            }
          });
        } else {
          // 新しい称号を作成
          await prisma.userTitle.create({
            data: {
              user_id: stat.user.id,
              title_id: titleMaster.id,
              awarded_at: getCurrentDate(),
              embed_data: embedData,
              grade: grade,
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
        const expResult = await expSystemModule.addExperience(prisma, stat.user.id, expReward, 'TITLE_ACQUISITION');
        console.log(`🏆 神様${periodText}${rank}位: ${stat.user.name} (${diety.name}) が称号「${titleMaster.name_template}」を獲得 (${expReward}EXP)`);
        if (expResult.levelUp) {
          console.log(`🏆 神様${periodText}${rank}位: ${stat.user.name} レベルアップ →${expResult.newLevel}, 獲得AP: ${expResult.abilityPointsGained}`);
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
  const now = getCurrentDate();

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
app.post('/admin/ranking-awards', requireAdminApiKey, async (req, res) => {
  try {
    const currentDate = getCurrentDate();
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
      // トランザクションでサムネイル付け替えを実行
      await prisma.$transaction(async (tx) => {
        // 現在のサムネイルを解除
        if (currentThumbnail) {
          await tx.shrineImage.update({
            where: { id: currentThumbnail.id },
            data: { is_current_thumbnail: false }
          });
        }

        // 新しいサムネイルを設定
        await tx.shrineImage.update({
          where: { id: topImage.id },
          data: { is_current_thumbnail: true }
        });

        // 神社テーブルを更新
        await tx.shrine.update({
          where: { id: shrineId },
          data: {
            image_id: topImage.image.id,
            image_url: topImage.image.url_m,
            image_url_xs: topImage.image.url_xs,
            image_url_s: topImage.image.url_s,
            image_url_m: topImage.image.url_m,
            image_url_l: topImage.image.url_l,
            image_url_xl: topImage.image.url_xl,
            image_by: topImage.user.name
          }
        });
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
          image_url: topImage.image.url_m,
          image_url_xs: topImage.image.url_xs,
          image_url_s: topImage.image.url_s,
          image_url_m: topImage.image.url_m,
          image_url_l: topImage.image.url_l,
          image_url_xl: topImage.image.url_xl,
          image_by: topImage.user.name
        }
      });

      console.log(`神様${dietyId}のサムネイルが投票結果により更新されました`);
    }
  } catch (err) {
    console.error('神様サムネイル更新エラー:', err);
  }
}

// ===== シミュレート日付管理API =====

// テスト用ルート
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working!' });
});

// シミュレート日付を設定
app.post('/api/simulate-date', (req, res) => {
  try {
    const { date } = req.body;
    const result = setSimulateDate(date);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        simulateDate: getSimulateDate()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('シミュレート日付設定エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// シミュレート日付をクリア
app.delete('/api/simulate-date', (req, res) => {
  try {
    const result = setSimulateDate(null);
    res.json({
      success: true,
      message: result.message,
      simulateDate: getSimulateDate()
    });
  } catch (error) {
    console.error('シミュレート日付クリアエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// シミュレート日付を取得
app.get('/api/simulate-date', (req, res) => {
  try {
    res.json({
      success: true,
      simulateDate: getSimulateDate(),
      currentDate: getCurrentDate().toISOString()
    });
  } catch (error) {
    console.error('シミュレート日付取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// シードモード設定（開発環境のみ）
app.post('/api/seed-mode', (req, res) => {
  try {
    const { enabled } = req.body;

    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'シードモードは開発環境でのみ使用可能です'
      });
    }

    if (enabled) {
      process.env.SEED_MODE = 'true';
      console.log('🌱 シードモードを有効化しました');
    } else {
      delete process.env.SEED_MODE;
      console.log('🌱 シードモードを無効化しました');
    }

    res.json({
      success: true,
      message: `シードモードを${enabled ? '有効化' : '無効化'}しました`,
      seedMode: process.env.SEED_MODE || 'disabled'
    });
  } catch (error) {
    console.error('シードモード設定エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// ===== シミュレーション管理API =====

// シミュレーション開始（N日前から開始）
app.post('/api/simulation/start', (req, res) => {
  try {
    const { daysAgo } = req.body;

    if (typeof daysAgo !== 'number' || daysAgo < 0) {
      return res.status(400).json({
        success: false,
        message: 'daysAgoは0以上の数値である必要があります'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0); // 日付の開始時刻に設定

    const result = setSimulateDate(startDate.toISOString());

    if (result.success) {
      res.json({
        success: true,
        message: `シミュレーションを${daysAgo}日前から開始しました`,
        simulateDate: getSimulateDate(),
        currentDate: getCurrentDate().toISOString(),
        daysAgo: daysAgo
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('シミュレーション開始エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// シミュレーション終了（日付をクリア）
app.post('/api/simulation/end', (req, res) => {
  try {
    const result = setSimulateDate(null);
    res.json({
      success: true,
      message: 'シミュレーションを終了しました',
      simulateDate: getSimulateDate(),
      currentDate: getCurrentDate().toISOString()
    });
  } catch (error) {
    console.error('シミュレーション終了エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// シミュレーション状態取得
app.get('/api/simulation/status', (req, res) => {
  try {
    const simulateDate = getSimulateDate();
    const currentDate = getCurrentDate();

    let daysElapsed = null;
    if (simulateDate) {
      const startDate = new Date(simulateDate);
      const diffTime = currentDate.getTime() - startDate.getTime();
      daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    res.json({
      success: true,
      isActive: !!simulateDate,
      simulateDate: simulateDate,
      currentDate: currentDate.toISOString(),
      daysElapsed: daysElapsed
    });
  } catch (error) {
    console.error('シミュレーション状態取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// 通知関連API

// ユーザーの未読通知一覧取得
app.get('/api/notifications', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const currentDate = getCurrentDate();
    console.log('🔍 通知一覧取得リクエスト:', { userId, currentDate });

    const notifications = await prisma.notification.findMany({
      where: {
        is_active: true,
        start_at: { lte: currentDate },
        OR: [
          { end_at: null },
          { end_at: { gte: currentDate } }
        ]
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        user_reads: userId ? {
          where: {
            user_id: userId
          }
        } : false
      }
    });

    const responseData = {
      success: true,
      notifications: notifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        type: notification.type,
        is_read: userId ? (notification.user_reads?.length > 0 ? notification.user_reads[0].is_read : false) : false,
        created_at: notification.created_at
      }))
    };
    console.log('📡 通知一覧取得レスポンス:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('通知一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// 通知詳細取得
app.get('/api/notifications/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user_reads: {
          where: {
            user_id: userId
          }
        }
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知が見つかりません'
      });
    }

    // 既読状態を更新
    const userRead = notification.user_reads[0];
    if (!userRead || !userRead.is_read) {
      await prisma.userNotification.upsert({
        where: {
          user_id_notification_id: {
            user_id: userId,
            notification_id: notificationId
          }
        },
        update: {
          is_read: true,
          read_at: getCurrentDate()
        },
        create: {
          user_id: userId,
          notification_id: notificationId,
          is_read: true,
          read_at: getCurrentDate()
        }
      });
    }

    // 更新後の通知データを再取得
    const updatedNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user_reads: {
          where: {
            user_id: userId
          }
        }
      }
    });

    res.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        title: updatedNotification.title,
        content: updatedNotification.content,
        type: updatedNotification.type,
        created_at: updatedNotification.created_at,
        is_read: updatedNotification.user_reads[0]?.is_read || false
      }
    });
  } catch (error) {
    console.error('通知詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// 通知既読状態更新
app.post('/api/notifications/:id/read', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    await prisma.userNotification.upsert({
      where: {
        user_id_notification_id: {
          user_id: userId,
          notification_id: notificationId
        }
      },
      update: {
        is_read: true,
        read_at: getCurrentDate()
      },
      create: {
        user_id: userId,
        notification_id: notificationId,
        is_read: true,
        read_at: getCurrentDate()
      }
    });

    res.json({
      success: true,
      message: '通知を既読にしました'
    });
  } catch (error) {
    console.error('通知既読更新エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// 未読通知数取得
app.get('/api/notifications/unread/count', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const currentDate = getCurrentDate();
    console.log('🔍 未読数取得リクエスト:', { userId, currentDate });

    const count = await prisma.notification.count({
      where: {
        is_active: true,
        start_at: { lte: currentDate },
        OR: [
          { end_at: null },
          { end_at: { gte: currentDate } }
        ],
        ...(userId ? {
          user_reads: {
            none: {
              user_id: userId,
              is_read: true
            }
          }
        } : {})
      }
    });

    const responseData = {
      success: true,
      count: count
    };
    console.log('📡 未読数取得レスポンス:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('未読通知数取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// エラーハンドリングミドルウェアを追加
app.use(errorLogger);

// すべての未定義APIはJSONで404を返す
app.use((req, res) => {
  res.status(404).json({ error: 'API not found' });
});

module.exports = app;

// listenは必ず全API定義の後に配置
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Current date: ${getCurrentDate().toISOString()}`);
    const simulateDate = getSimulateDate();
    if (simulateDate) {
      console.log(`Simulate date: ${simulateDate}`);
    }
  });
}

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
