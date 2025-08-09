// レベルシステムの定数
const LEVEL_SYSTEM = {
  // 基本設定
  MAX_LEVEL: 100,
  BASE_PRAY_DISTANCE: 100, // レベル0の基本参拝距離
  BASE_WORSHIP_COUNT: 1,   // レベル0の基本遥拝回数

  // レベルアップ時の能力ポイント獲得
  ABILITY_POINTS_PER_LEVEL: 100,

  // サブスクリプション効果
  SUBSCRIPTION_EFFECTS: {
    RANGE_MULTIPLIER: 2,    // 参拝距離倍率
    WORSHIP_BOOST: 1,       // 遥拝回数追加
  }
};

// 能力タイプ
const ABILITY_TYPES = {
  RANGE: 'range',           // 参拝距離
  WORSHIP: 'worship',       // 遥拝回数
  SKIN: 'skin',             // スキン購入
  IMAGE_POST: 'image_post', // 画像投稿
  HISTORY_POST: 'history_post', // 伝承投稿
  SHRINE_APPLY: 'shrine_apply', // 神社申請
  APPROVAL: 'approval',     // 承認権限
};

// サブスクリプションタイプ
const SUBSCRIPTION_TYPES = {
  RANGE_MULTIPLIER: 'range_multiplier',
  WORSHIP_BOOST: 'worship_boost',
  RESET_ABILITIES: 'reset_abilities',
};

module.exports = {
  LEVEL_SYSTEM,
  ABILITY_TYPES,
  SUBSCRIPTION_TYPES
};
