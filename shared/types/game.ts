import { AbilityType } from '../constants/levelSystem';

// ユーザー基本情報
export interface UserBasic {
  id: string;
  name: string;
  level: number;
  exp: number;
  abilityPoints: number;
  thumbnail?: string;
}

// 能力情報
export interface Ability {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  cost: number;
  maxLevel: number;
  currentLevel: number;
  isOwned: boolean;
}

// 称号情報
export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isOwned: boolean;
  isEquipped: boolean;
}

// 参拝情報
export interface PrayInfo {
  distance: number;
  maxDistance: number;
  canPray: boolean;
  worshipCount: number;
  maxWorshipCount: number;
}

// 経験値獲得結果
export interface ExpGainResult {
  gainedExp: number;
  leveledUp: boolean;
  newLevel: number;
  oldLevel: number;
  newAbilityPoints: number;
}

// 画像投稿情報
export interface ImagePost {
  id: string;
  userId: string;
  shrineId?: string;
  dietyId?: string;
  imageUrl: string;
  caption?: string;
  createdAt: Date;
}

// 伝承投稿情報
export interface HistoryPost {
  id: string;
  userId: string;
  shrineId?: string;
  dietyId?: string;
  title: string;
  content: string;
  createdAt: Date;
}

// サブスクリプション情報
export interface Subscription {
  id: string;
  userId: string;
  type: string;
  isActive: boolean;
  expiresAt?: Date;
  effects: {
    rangeMultiplier?: number;
    worshipBoost?: number;
    canResetAbilities?: boolean;
  };
} 