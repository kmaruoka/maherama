const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    console.log('🔍 通知データを確認中...');

    const notifications = await prisma.notification.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`📊 通知データ数: ${notifications.length}件`);

    if (notifications.length === 0) {
      console.log('❌ 通知データが存在しません');
      return;
    }

    console.log('\n📋 通知一覧:');
    notifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title}`);
      console.log(`   タイプ: ${notification.type}`);
      console.log(`   アクティブ: ${notification.is_active}`);
      console.log(`   開始日: ${notification.start_at}`);
      console.log(`   終了日: ${notification.end_at || 'なし'}`);
      console.log('');
    });

    // 現在の日付で有効な通知を確認
    const currentDate = new Date();
    const activeNotifications = await prisma.notification.findMany({
      where: {
        is_active: true,
        start_at: { lte: currentDate },
        OR: [
          { end_at: null },
          { end_at: { gte: currentDate } }
        ]
      }
    });

    console.log(`✅ 現在有効な通知: ${activeNotifications.length}件`);

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
