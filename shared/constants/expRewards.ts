// 経験値獲得の種類
export const EXP_REWARDS = {
  PRAY: 10,           // 参拝
  REMOTE_PRAY: 10,    // 遥拝
  IMAGE_POST: 10,     // 画像投稿
  HISTORY_POST: 10,   // 伝承投稿
  TITLE_ACQUISITION: 50, // 称号獲得（基本）
  SHRINE_APPROVAL: 500,  // 神社申請→承認
} as const;

export type ExpRewardType = keyof typeof EXP_REWARDS;
export type ExpRewardValue = typeof EXP_REWARDS[ExpRewardType]; 