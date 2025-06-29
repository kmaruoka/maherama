require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://amana_user:amana_pass@127.0.0.1:15432/amana',
});

async function seed() {
  const filePath = path.join(__dirname, 'data.txt');
  const content = fs.readFileSync(filePath, 'utf-8');
  const sections = content.split(/\n{2,}/);

  const shrineMap = new Map(); // shrine name -> shrine_id
  const dietyMap = new Map();  // diety name -> diety_id

  for (const section of sections) {
    if (section.startsWith('[神社]')) {
      const lines = section.split('\n').slice(1);
      for (const line of lines) {
        const [name, address, lat, lng, dietiesStr] = line.trim().split('\t');
        const res = await pool.query(
          'INSERT INTO shrines(name, address, lat, lng) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, address, parseFloat(lat), parseFloat(lng)]
        );
        const shrineId = res.rows[0].id;
        shrineMap.set(name, shrineId);
        const dieties = dietiesStr.split(',').map(s => s.trim());
        for (const d of dieties) {
          if (!dietyMap.has(d)) {
            const r = await pool.query('INSERT INTO dieties(name) VALUES ($1) RETURNING id', [d]);
            dietyMap.set(d, r.rows[0].id);
          }
          await pool.query(
            'INSERT INTO shrine_diety(shrine_id, diety_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [shrineId, dietyMap.get(d)]
          );
        }
      }
    } else if (section.startsWith('[神]')) {
      const lines = section.split('\n').slice(1);
      for (const line of lines) {
        const [name, kana, description] = line.trim().split('\t');
        if (!dietyMap.has(name)) {
          const r = await pool.query(
            'INSERT INTO dieties(name, kana, description) VALUES ($1, $2, $3) RETURNING id',
            [name, kana || null, description || null]
          );
          dietyMap.set(name, r.rows[0].id);
        } else {
          await pool.query(
            'UPDATE dieties SET kana=$1, description=$2 WHERE id=$3',
            [kana || null, description || null, dietyMap.get(name)]
          );
        }
      }
    }
  }

  console.log("Test data seeded.");
  await pool.end();
}

seed().catch(err => {
  console.error("Seeding failed", err);
  process.exit(1);
});
