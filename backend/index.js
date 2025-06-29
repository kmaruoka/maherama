require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const app = express();
const port = process.env.PORT || 3001;

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

let lastRemotePray = null;
const REMOTE_INTERVAL_DAYS = 7;

async function addLog(message, type = 'normal') {
  await prisma.log.create({
    data: {
      message,
      type
    }
  });
}

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
    const countMap = Object.fromEntries(
      shrineCounts.map((c) => [c.shrine_id, c._sum.count || 0])
    );

    const formattedShrines = shrines.map((shrine) => ({
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
  try {
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        kana: true,
        location: true,
        address: true,
        lat: true,
        lng: true,
        registered_at: true,
        thumbnailUrl: true,
        thumbnailBy: true,
        founded: true,
        history: true,
        festivals: true,
        description: true
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
      registeredAt: shrine.registered_at
    };
    
    res.json(formattedShrine);
  } catch (err) {
    console.error('Error fetching shrine:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/shrines/:id/pray', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const shrine = await prisma.shrine.findUnique({
      where: { id },
      select: { name: true, count: true }
    });
    
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const updatedShrine = await prisma.shrine.update({
      where: { id },
      data: { count: shrine.count + 1 },
      select: { count: true }
    });
    
    await addLog(`<shrine:${id}:${shrine.name}>を参拝しました`);
    res.json({ success: true, count: updatedShrine.count });
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
      select: { name: true, count: true }
    });
    
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const now = new Date();
    if (!lastRemotePray) {
      const lastLog = await prisma.log.findFirst({
        where: {
          message: {
            contains: 'を遥拝しました'
          }
        },
        orderBy: {
          time: 'desc'
        }
      });
      if (lastLog) lastRemotePray = lastLog.time;
    }
    
    if (lastRemotePray) {
      const diff = now - lastRemotePray;
      if (diff < REMOTE_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ error: '遥拝は一週間に1回のみ可能です' });
      }
    }
    
    lastRemotePray = now;
    const updatedShrine = await prisma.shrine.update({
      where: { id },
      data: { count: shrine.count + 1 },
      select: { count: true }
    });
    
    await addLog(`<shrine:${id}:${shrine.name}>を遥拝しました`);
    res.json({ success: true, count: updatedShrine.count });
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
    const countMap = Object.fromEntries(
      dietyCounts.map((c) => [c.diety_id, c._sum.count || 0])
    );

    const formatted = dieties.map((d) => ({
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
  try {
    const diety = await prisma.diety.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        registered_at: true
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
      registeredAt: diety.registered_at
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

app.listen(port, () => {
  addLog('システム: サーバーを起動しました', 'system');
  console.log(`Server listening on port ${port}`);
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
