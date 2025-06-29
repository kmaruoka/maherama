require('dotenv').config();
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const { spawnSync } = require('child_process');

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

async function initDb() {
  await recreateDatabase();

  const result = spawnSync(
    'npx',
    ['prisma', 'db', 'push', '--schema=prisma/schema.prisma'],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );
  if (result.status !== 0) {
    process.exit(result.status);
  }

  console.log('Database initialized.');
}

initDb().catch(err => {
  console.error("DB init failed", err);
  process.exit(1);
});
