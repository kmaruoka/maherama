import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserAP() {
  try {
    console.log('🔄 ユーザーのAPを更新中...');
    
    // 全ユーザーを取得
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      // レベルに応じたAPを計算（初期値50 + レベルアップ分）
      const expectedAP = 50 + (user.level - 1) * 100;  // 10から100に修正
      
      // 現在のAPが期待値より少ない場合のみ更新
      if (user.ability_points < expectedAP) {
        await prisma.user.update({
          where: { id: user.id },
          data: { ability_points: expectedAP }
        });
        console.log(`✅ ユーザー ${user.name} (ID: ${user.id}) のAPを ${user.ability_points} → ${expectedAP} に更新`);
      } else {
        console.log(`ℹ️ ユーザー ${user.name} (ID: ${user.id}) のAPは既に適正値: ${user.ability_points}`);
      }
    }
    
    console.log('🎉 全ユーザーのAP更新が完了しました');
  } catch (error) {
    console.error('❌ AP更新中にエラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateUserAP(); 