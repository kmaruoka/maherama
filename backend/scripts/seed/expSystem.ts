import { PrismaClient } from '@prisma/client';
import { 
  EXP_REWARDS, 
  LEVEL_SYSTEM,
  calculateLevel,
  calculateRequiredExp,
  addExperience as addExpShared,
  calculatePrayDistance,
  calculateWorshipCount
} from '../../../shared';

// 経験値を追加し、レベルアップをチェックする
export async function addExperience(
  prisma: PrismaClient,
  userId: number,
  expAmount: number
): Promise<{ newLevel: number; levelUp: boolean; abilityPointsGained: number }> {
  // トランザクションで経験値追加とレベルアップを処理
  return await prisma.$transaction(async (tx) => {
    // ユーザー情報を取得
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, exp: true, ability_points: true }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 共有ライブラリで経験値計算
    const expResult = addExpShared(user.exp, 'PRAY'); // デフォルトでPRAYを使用
    
    // ユーザー情報を更新
    await tx.user.update({
      where: { id: userId },
      data: {
        exp: expResult.newExp,
        level: expResult.newLevel,
        ability_points: user.ability_points + (expResult.leveledUp ? 1 : 0)
      }
    });

    return {
      newLevel: expResult.newLevel,
      levelUp: expResult.leveledUp,
      abilityPointsGained: expResult.leveledUp ? 1 : 0
    };
  });
}

// ユーザーの現在の参拝距離を取得
export async function getUserPrayDistance(
  prisma: PrismaClient,
  userId: number
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 能力による追加距離を計算
  const rangeAbilities = await prisma.userAbility.findMany({
    where: {
      user_id: userId,
      ability: {
        effect_type: 'range'
      }
    },
    include: {
      ability: true
    }
  });

  const rangeAbilityLevel = rangeAbilities.reduce((sum, userAbility) => {
    return sum + userAbility.ability.effect_value;
  }, 0);

  // サブスクリプションによる倍率を取得
  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      user_id: userId,
      subscription_type: 'range_multiplier',
      is_active: true,
      expires_at: {
        gt: new Date()
      }
    }
  });

  const subscriptionMultiplier = activeSubscription ? 2 : 1;

  // 共有ライブラリで距離計算
  return calculatePrayDistance(user.level, rangeAbilityLevel, subscriptionMultiplier);
}

// ユーザーの1日の遥拝回数を取得
export async function getUserWorshipCount(
  prisma: PrismaClient,
  userId: number
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 能力による追加回数を計算
  const worshipAbilities = await prisma.userAbility.findMany({
    where: {
      user_id: userId,
      ability: {
        effect_type: 'worship'
      }
    },
    include: {
      ability: true
    }
  });

  const worshipAbilityLevel = worshipAbilities.reduce((sum, userAbility) => {
    return sum + userAbility.ability.effect_value;
  }, 0);

  // サブスクリプションによる追加回数を計算
  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      user_id: userId,
      subscription_type: 'worship_boost',
      is_active: true,
      expires_at: {
        gt: new Date()
      }
    }
  });

  const subscriptionBoost = activeSubscription ? 1 : 0;

  // 共有ライブラリで遥拝回数計算
  return calculateWorshipCount(user.level, worshipAbilityLevel, subscriptionBoost);
}

// 今日の遥拝回数を取得
export async function getTodayWorshipCount(
  prisma: PrismaClient,
  userId: number
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.remotePray.count({
    where: {
      user_id: userId,
      prayed_at: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  return count;
}

// 能力を購入できるかチェック
export async function canPurchaseAbility(
  prisma: PrismaClient,
  userId: number,
  abilityId: number
): Promise<{ canPurchase: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ability_points: true }
  });

  if (!user) {
    return { canPurchase: false, reason: 'User not found' };
  }

  const ability = await prisma.abilityMaster.findUnique({
    where: { id: abilityId }
  });

  if (!ability) {
    return { canPurchase: false, reason: 'Ability not found' };
  }

  // 既に購入済みかチェック
  const existingAbility = await prisma.userAbility.findUnique({
    where: {
      user_id_ability_id: {
        user_id: userId,
        ability_id: abilityId
      }
    }
  });

  if (existingAbility) {
    return { canPurchase: false, reason: 'Already purchased' };
  }

  // 能力ポイントが足りるかチェック
  if (user.ability_points < ability.cost) {
    return { canPurchase: false, reason: 'Insufficient ability points' };
  }

  return { canPurchase: true };
}

// 能力を購入
export async function purchaseAbility(
  prisma: PrismaClient,
  userId: number,
  abilityId: number
): Promise<{ success: boolean; reason?: string }> {
  const checkResult = await canPurchaseAbility(prisma, userId, abilityId);
  
  if (!checkResult.canPurchase) {
    return { success: false, reason: checkResult.reason };
  }

  const ability = await prisma.abilityMaster.findUnique({
    where: { id: abilityId }
  });

  if (!ability) {
    return { success: false, reason: 'Ability not found' };
  }

  // トランザクションで購入処理
  await prisma.$transaction(async (tx) => {
    // ユーザー能力ポイントを減らす
    await tx.user.update({
      where: { id: userId },
      data: {
        ability_points: {
          decrement: ability.cost
        }
      }
    });

    // 能力を購入
    await tx.userAbility.create({
      data: {
        user_id: userId,
        ability_id: abilityId
      }
    });

    // 購入ログを記録
    await tx.abilityLog.create({
      data: {
        user_id: userId,
        ability_id: abilityId,
        points_spent: ability.cost
      }
    });
  });

  return { success: true };
} 