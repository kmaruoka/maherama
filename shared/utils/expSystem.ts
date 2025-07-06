import { EXP_REWARDS, ExpRewardType } from '../constants/expRewards';
import { LEVEL_SYSTEM } from '../constants/levelSystem';

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
 * 経験値獲得時の処理
 */
export function addExperience(
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