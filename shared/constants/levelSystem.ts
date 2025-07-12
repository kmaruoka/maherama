// レベルシステムの定数
export const LEVEL_SYSTEM = {
  // 基本設定
  MAX_LEVEL: 50,
  BASE_PRAY_DISTANCE: 100, // レベル0の基本参拝距離
  BASE_WORSHIP_COUNT: 1,   // レベル0の基本遥拝回数
  
  // レベルアップ時の能力ポイント獲得
  ABILITY_POINTS_PER_LEVEL: 100,  // 10から100に戻す（6日前の設定）
  
  // サブスクリプション効果
  SUBSCRIPTION_EFFECTS: {
    RANGE_MULTIPLIER: 2,    // 参拝距離倍率
    WORSHIP_BOOST: 1,       // 遥拝回数追加
  }
} as const;

// 能力タイプ
export const ABILITY_TYPES = {
  RANGE: 'range',           // 参拝距離
  WORSHIP: 'worship',       // 遥拝回数
  SKIN: 'skin',             // スキン購入
  IMAGE_POST: 'image_post', // 画像投稿
  HISTORY_POST: 'history_post', // 伝承投稿
  SHRINE_APPLY: 'shrine_apply', // 神社申請
  APPROVAL: 'approval',     // 承認権限
} as const;

export type AbilityType = typeof ABILITY_TYPES[keyof typeof ABILITY_TYPES];

// サブスクリプションタイプ
export const SUBSCRIPTION_TYPES = {
  RANGE_MULTIPLIER: 'range_multiplier',
  WORSHIP_BOOST: 'worship_boost',
  RESET_ABILITIES: 'reset_abilities',
} as const;

export type SubscriptionType = typeof SUBSCRIPTION_TYPES[keyof typeof SUBSCRIPTION_TYPES]; 