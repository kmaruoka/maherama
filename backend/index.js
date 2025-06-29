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
        count: true,
        registered_at: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    const formattedShrines = shrines.map(shrine => ({
      ...shrine,
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
        lat: true,
        lng: true,
        count: true,
        registered_at: true
      }
    });
    
    if (!shrine) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const formattedShrine = {
      ...shrine,
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
