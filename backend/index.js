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
  res.json({ success: true, count: shrine.count });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
