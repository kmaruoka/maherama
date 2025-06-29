const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// simple in-memory data
const shrines = [
  {
    id: 1,
    name: '明治神宮',
    lat: 35.6764,
    lng: 139.6993,
    count: 0,
    registeredAt: '2024-01-01'
  },
  {
    id: 2,
    name: '伏見稲荷大社',
    lat: 34.9671,
    lng: 135.7727,
    count: 0,
    registeredAt: '2024-02-01'
  }
];

let logs = [];
let lastRemotePray = null;
const REMOTE_INTERVAL_DAYS = 7;

function addLog(message) {
  logs.unshift({ message, time: new Date().toISOString() });
  if (logs.length > 50) logs = logs.slice(0, 50);
}

app.get('/shrines', (req, res) => {
  res.json(shrines);
});

app.get('/shrines/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const shrine = shrines.find((s) => s.id === id);
  if (!shrine) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(shrine);
});

app.post('/shrines/:id/pray', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const shrine = shrines.find(s => s.id === id);
  if (!shrine) return res.status(404).json({ error: 'Not found' });
  shrine.count += 1;
  addLog(`${shrine.name}を参拝しました`);
  res.json({ success: true, count: shrine.count });
});

app.post('/shrines/:id/remote-pray', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const shrine = shrines.find(s => s.id === id);
  if (!shrine) return res.status(404).json({ error: 'Not found' });
  const now = new Date();
  if (lastRemotePray) {
    const diff = now - lastRemotePray;
    if (diff < REMOTE_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
      return res
        .status(400)
        .json({ error: '遥拝は一週間に1回のみ可能です' });
    }
  }
  lastRemotePray = now;
  shrine.count += 1;
  addLog(`${shrine.name}を遥拝しました`);
  res.json({ success: true, count: shrine.count });
});

app.get('/logs', (req, res) => {
  res.json(logs);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
