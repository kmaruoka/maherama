require('dotenv').config();
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://amana_user:amana_pass@127.0.0.1:15432/amana';
const config = parse(connectionString);

async function recreateDatabase() {
  const adminPool = new Pool({
    host: config.host ?? '127.0.0.1',
    port: config.port ? Number(config.port) : 5432,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });
  const dbName = config.database;
  if (!dbName) throw new Error('No database name in connection string');

  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
  await adminPool.end();
}

let pool;

async function initDb() {
  await recreateDatabase();
  pool = new Pool({ connectionString });
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
