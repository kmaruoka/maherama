const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 本番のawardRankingTitles関数をインポート
const { awardRankingTitles } = require('./index');

async function awardTitles() {
  try {
    console.log('称号付与処理を開始...');

    // 現在の日付を取得
    const currentDate = new Date();

    // 月間ランキング称号付与（本番APIを使用）
    console.log('月間ランキング称号付与中...');
    await awardRankingTitles('monthly', currentDate);

    // 年間ランキング称号付与（年末の場合）
    if (currentDate.getMonth() === 0 && currentDate.getDate() === 1) {
      console.log('年間ランキング称号付与中...');
      const lastYear = new Date(currentDate.getFullYear() - 1, 11, 31);
      await awardRankingTitles('yearly', lastYear);
    }

    console.log('称号付与完了');

  } catch (error) {
    console.error('称号付与エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

awardTitles();
