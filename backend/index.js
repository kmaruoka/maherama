const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 15432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres'
});

app.use(cors());
app.use(express.json());

let lastRemotePray = null;
const REMOTE_INTERVAL_DAYS = 7;

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS shrines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM shrines');
  if (rows[0].cnt === 0) {
    await pool.query(
      `INSERT INTO shrines (name, lat, lng, registered_at) VALUES
        ('明治神宮', 35.6764, 139.6993, '2024-01-01'),
        ('伏見稲荷大社', 34.9671, 135.7727, '2024-02-01')`
    );
  }
}

async function addLog(message, type = 'normal') {
  await pool.query('INSERT INTO logs(message, type) VALUES ($1, $2)', [message, type]);
}

app.get('/shrines', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, lat, lng, count, registered_at AS "registeredAt" FROM shrines ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/shrines/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query(
      'SELECT id, name, lat, lng, count, registered_at AS "registeredAt" FROM shrines WHERE id=$1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/shrines/:id/pray', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query('SELECT name, count FROM shrines WHERE id=$1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const shrine = rows[0];
    const newCount = shrine.count + 1;
    await pool.query('UPDATE shrines SET count=$1 WHERE id=$2', [newCount, id]);
    await addLog(`<shrine:${shrine.name}>を参拝しました`);
    res.json({ success: true, count: newCount });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/shrines/:id/remote-pray', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query('SELECT name, count FROM shrines WHERE id=$1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const shrine = rows[0];
    const now = new Date();
    if (!lastRemotePray) {
      const lr = await pool.query(
        "SELECT time FROM logs WHERE message LIKE '%を遥拝しました' ORDER BY time DESC LIMIT 1"
      );
      if (lr.rows.length) lastRemotePray = new Date(lr.rows[0].time);
    }
    if (lastRemotePray) {
      const diff = now - lastRemotePray;
      if (diff < REMOTE_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ error: '遥拝は一週間に1回のみ可能です' });
      }
    }
    lastRemotePray = now;
    const newCount = shrine.count + 1;
    await pool.query('UPDATE shrines SET count=$1 WHERE id=$2', [newCount, id]);
    await addLog(`<shrine:${shrine.name}>を遥拝しました`);
    res.json({ success: true, count: newCount });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT message, type, time FROM logs ORDER BY time DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

initDb()
  .then(() => {
    app.listen(port, () => {
      addLog('システム: サーバーを起動しました', 'system');
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('DB initialization failed', err);
    process.exit(1);
  });
