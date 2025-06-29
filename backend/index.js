require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

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

// slotsから参拝可能半径を導出する関数
function getRadiusFromSlots(slots) {
  if (slots === 0) return 100; // 無課金
  return 100 * Math.pow(2, slots); // 100m, 200m, 400m, 800m, 1600m...
}

// ユーザーの課金状態を取得する関数
async function getUserSubscription(userId) {
  const subscription = await prisma.userSubscription.findFirst({
    where: { 
      user_id: userId,
      expires_at: { gt: new Date() }
    },
    orderBy: { created_at: 'desc' }
  });
  return subscription || { slots: 0 }; // 無課金の場合
}

async function addLog(message, type = 'normal') {
  await prisma.log.create({
    data: {
      message,
      type
    }
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

app.post('/shrines/:id/pray', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    // 神社名と神様リレーションも取得（diety_id全件）
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: {
        name: true,
        shrine_dieties: { select: { diety_id: true } }
      }
    });
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    // ユーザーIDをリクエストヘッダーから取得（なければ1）
    const userId = parseInt(req.headers['x-user-id']) || 1;
    // --- 神社カウント ---
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
    await addLog(`<shrine:${id}:${shrine.name}>を参拝しました`);
    res.json({ success: true, count: totalCount._sum.count || 0 });
  } catch (err) {
    console.error('Error praying at shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/shrines/:id/remote-pray', async (req, res) => {
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
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // ユーザーの課金状態を取得
    const subscription = await getUserSubscription(userId);
    const maxRemotePrays = subscription.slots;
    
    // 過去1週間の遥拝回数をカウント
    const recentRemotePrays = await prisma.remotePray.count({
      where: {
        user_id: userId,
        prayed_at: { gte: oneWeekAgo }
      }
    });
    
    // 課金口数制限チェック
    if (recentRemotePrays >= maxRemotePrays) {
      return res.status(400).json({ 
        error: `遥拝は1週間に${maxRemotePrays}回までです（課金口数: ${maxRemotePrays}口）` 
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
    
    await addLog(`<shrine:${id}:${shrine.name}>を遥拝しました`);
    res.json({ success: true, count: totalCount._sum.count || 0 });
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

app.get('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const viewerId = req.query.viewerId ? parseInt(req.query.viewerId, 10) : null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
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

    res.json({
      id: user.id,
      name: user.name,
      followingCount,
      followerCount,
      topShrines: shrineStats.map((s) => ({ id: s.shrine.id, name: s.shrine.name, count: s.count })),
      topDieties: dietyStats.map((d) => ({ id: d.diety.id, name: d.diety.name, count: d.count })),
      isFollowing,
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/follows', async (req, res) => {
  const { followerId, followingId } = req.body;
  try {
    await prisma.follow.create({ data: { follower_id: followerId, following_id: followingId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error follow:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/follows', async (req, res) => {
  const { followerId, followingId } = req.body;
  try {
    await prisma.follow.delete({
      where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error unfollow:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/user-rankings', async (req, res) => {
  try {
    const rankings = await prisma.shrinePrayStats.groupBy({
      by: ['user_id'],
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
      take: 20,
    });
    const userIds = rankings.map(r => r.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    const result = rankings.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      userName: userMap[r.user_id] || '名無し',
      count: r._sum.count || 0,
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user rankings:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/shrines/:id/rankings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const period = req.query.period || 'all'; // all, yearly, monthly, weekly
  
  try {
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: { name: true }
    });
    
    if (!shrine) {
      return res.status(404).json({ error: '神社が見つかりません' });
    }
    
    let rankings;
    switch (period) {
      case 'yearly':
        rankings = await prisma.shrinePrayStatsYearly.findMany({
          where: { shrine_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
        break;
      case 'monthly':
        rankings = await prisma.shrinePrayStatsMonthly.findMany({
          where: { shrine_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
        break;
      case 'weekly':
        rankings = await prisma.shrinePrayStatsWeekly.findMany({
          where: { shrine_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
        break;
      default: // all
        rankings = await prisma.shrinePrayStats.findMany({
          where: { shrine_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
    }
    
    const userIds = rankings.map(r => r.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    
    const result = rankings.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      userName: userMap[r.user_id] || '名無し',
      count: r.count
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching shrine rankings:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/dieties/:id/rankings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const period = req.query.period || 'all'; // all, yearly, monthly, weekly
  
  // デバッグ用ログ
  console.log('Diety Rankings - ID parameter:', req.params.id, 'Parsed ID:', id, 'Period:', period);
  
  // IDが無効な値の場合はエラーを返す
  if (isNaN(id) || id <= 0) {
    console.error('Invalid diety ID for rankings:', req.params.id);
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  
  try {
    const diety = await prisma.diety.findUnique({
      where: { id },
      select: { name: true }
    });
    
    if (!diety) {
      return res.status(404).json({ error: '神が見つかりません' });
    }
    
    let rankings;
    switch (period) {
      case 'yearly':
        rankings = await prisma.dietyPrayStatsYearly.findMany({
          where: { diety_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
        break;
      case 'monthly':
        rankings = await prisma.dietyPrayStatsMonthly.findMany({
          where: { diety_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
        break;
      case 'weekly':
        rankings = await prisma.dietyPrayStatsWeekly.findMany({
          where: { diety_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
        break;
      default: // all
        rankings = await prisma.dietyPrayStats.findMany({
          where: { diety_id: id },
          orderBy: { count: 'desc' },
          take: 10,
        });
    }
    
    const userIds = rankings.map(r => r.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    
    const result = rankings.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      userName: userMap[r.user_id] || '名無し',
      count: r.count
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching diety rankings:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ユーザーごとの「よく参拝する神社」ランキング
app.get('/users/:id/shrine-rankings', async (req, res) => {
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

// ユーザーごとの「よく参拝する神様」ランキング
app.get('/users/:id/diety-rankings', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const period = req.query.period || 'all';
  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  try {
    let stats;
    switch (period) {
      case 'yearly':
        stats = await prisma.dietyPrayStatsYearly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'monthly':
        stats = await prisma.dietyPrayStatsMonthly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      case 'weekly':
        stats = await prisma.dietyPrayStatsWeekly.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
        break;
      default:
        stats = await prisma.dietyPrayStats.findMany({
          where: { user_id: userId },
          orderBy: { count: 'desc' },
          include: { diety: { select: { id: true, name: true } } },
          take: 10,
        });
    }
    const result = stats.map((d, i) => ({
      id: d.diety.id,
      name: d.diety.name,
      count: d.count,
      rank: i + 1
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching user diety rankings:', err);
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
