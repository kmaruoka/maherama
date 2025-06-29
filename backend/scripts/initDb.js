const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://amana_user:amana_pass@127.0.0.1:15432/amana',
});

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS shrines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS dieties (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    kana TEXT,
    description TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS shrine_diety (
    shrine_id INTEGER REFERENCES shrines(id) ON DELETE CASCADE,
    diety_id INTEGER REFERENCES dieties(id) ON DELETE CASCADE,
    PRIMARY KEY (shrine_id, diety_id)
  )`);

  console.log("Tables created.");
  await pool.end();
}

initDb().catch(err => {
  console.error("DB init failed", err);
  process.exit(1);
});
