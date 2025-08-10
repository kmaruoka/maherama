const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 管理者ユーザーの確認を開始...');

    // 管理者ユーザーを取得
    const adminUser = await prisma.user.findFirst({
      where: { name: 'admin' }
    });

    if (!adminUser) {
      console.error('❌ 管理者ユーザーが見つかりません');
      return;
    }

    console.log(`✅ 管理者ユーザーが見つかりました: ID=${adminUser.id}, role=${adminUser.role}`);

    // 全ユーザーを確認
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, role: true }
    });

    console.log('\n📊 全ユーザー一覧:');
    allUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.name}, Role: ${user.role || 'undefined'}`);
    });

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
