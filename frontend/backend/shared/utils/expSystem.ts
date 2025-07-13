/* eslint-disable no-console */
import { EXP_REWARDS, ExpRewardType } from '../constants/expRewards';
import { LEVEL_SYSTEM } from '../constants/levelSystem';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * 経験値からレベルを計算
 */
export function calculateLevel(exp: number): number {
  // レベル計算式: level = floor(sqrt(exp / 100)) + 1
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
  return Math.min(level, LEVEL_SYSTEM.MAX_LEVEL);
}

/**
 * レベルから必要経験値を計算
 */
export function calculateRequiredExp(level: number): number {
  // 逆算: exp = (level - 1)^2 * 100
  return Math.pow(level - 1, 2) * 100;
}

/**
 * 次のレベルまでの経験値を計算
 */
export function calculateExpToNextLevel(currentExp: number): number {
  const currentLevel = calculateLevel(currentExp);
  const nextLevelExp = calculateRequiredExp(currentLevel + 1);
  return Math.max(0, nextLevelExp - currentExp);
}

/**
 * 経験値獲得時の処理（ピュア関数）
 */
export function getExperienceResult(
  currentExp: number,
  rewardType: ExpRewardType
): {
  newExp: number;
  gainedExp: number;
  leveledUp: boolean;
  newLevel: number;
  oldLevel: number;
} {
  const oldLevel = calculateLevel(currentExp);
  const gainedExp = EXP_REWARDS[rewardType];
  const newExp = currentExp + gainedExp;
  const newLevel = calculateLevel(newExp);
  const leveledUp = newLevel > oldLevel;

  return {
    newExp,
    gainedExp,
    leveledUp,
    newLevel,
    oldLevel,
  };
}

/**
 * レベルアップ時の能力ポイント計算
 */
export function calculateAbilityPoints(level: number): number {
  return level * LEVEL_SYSTEM.ABILITY_POINTS_PER_LEVEL;
}

/**
 * DB更新付き: 経験値・レベル・APを更新し、詳細ログも出力
 */
export async function addExperience(
  prisma: PrismaClient,
  userId: number,
  expAmount: number,
  rewardType: ExpRewardType
): Promise<{ newLevel: number; levelUp: boolean; abilityPointsGained: number }> {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, exp: true, ability_points: true }
    });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // 直接expAmountを使用（rewardTypeの判定を削除）
    const oldLevel = calculateLevel(user.exp);
    const newExp = user.exp + expAmount;
    const newLevel = calculateLevel(newExp);
    const leveledUp = newLevel > oldLevel;
    
    // レベルアップ時のAP獲得量をLevelMasterテーブルから取得
    let abilityPointsGained = 0;
    if (leveledUp) {
      for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
        const levelMaster = await tx.levelMaster.findUnique({
          where: { level: lv },
          select: { ability_points: true }
        });
        if (levelMaster) {
          abilityPointsGained += levelMaster.ability_points;
          console.log(`[AP加算デバッグ] ユーザー${userId} レベル${lv}でAP+${levelMaster.ability_points}（合計: ${abilityPointsGained}）`);
        } else {
          console.error(`[AP加算エラー] LevelMasterにレベル${lv}のデータがありません`);
        }
      }
      console.log(`[AP詳細] ユーザー${userId} レベルアップ: ${oldLevel}→${newLevel}, 獲得AP: ${abilityPointsGained}, 更新前AP: ${user.ability_points}, 更新後AP: ${user.ability_points + abilityPointsGained}`);
    }
    
    await tx.user.update({
      where: { id: userId },
      data: {
        exp: newExp,
        level: newLevel,
        ability_points: user.ability_points + abilityPointsGained
      }
    });
    // ここで必ず詳細ログを出力
    console.log(`[addExperience] userId=${userId}, exp=${expAmount}, oldLevel=${oldLevel}, newLevel=${newLevel}, leveledUp=${leveledUp}, abilityPointsGained=${abilityPointsGained}`);
    return {
      newLevel: newLevel,
      levelUp: leveledUp,
      abilityPointsGained: abilityPointsGained
    };
  });
} 