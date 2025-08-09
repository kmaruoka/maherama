const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// テスト実行時のポート番号を固定
process.env.PORT = process.env.PORT || '3001';

beforeAll(async () => {
  console.log('🧪 テスト用DB接続確認中...');

  try {
    // DB接続確認のみ
    await prisma.$connect();
    console.log('✅ テスト用DB接続完了');
  } catch (error) {
    console.error('❌ テスト用DB接続エラー:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 テスト終了・DB接続切断');
  await prisma.$disconnect();
});
