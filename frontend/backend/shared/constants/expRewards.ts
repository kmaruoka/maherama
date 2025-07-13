// 経験値獲得の種類
export const EXP_REWARDS = {
  PRAY: 10,           // 参拝
  REMOTE_PRAY: 10,    // 遥拝
  IMAGE_POST: 20,     // 画像投稿
  HISTORY_POST: 20,   // 伝承投稿
  TITLE_ACQUISITION: 50, // 称号獲得（基本）
  SHRINE_APPROVAL: 500,  // 神社申請→承認
  WEEKLY_RANKING: 100,  // 週間ランキング1位
  MONTHLY_RANKING_1: 1000,  // 月間ランキング1位
  MONTHLY_RANKING_2: 500,  // 月間ランキング2位
  MONTHLY_RANKING_3: 200,  // 月間ランキング3位
  YEARLY_RANKING_1: 10000,  // 年間ランキング1位
  YEARLY_RANKING_2: 5000,  // 年間ランキング2位
  YEARLY_RANKING_3: 2000,  // 年間ランキング3位
} as const;

export type ExpRewardType = keyof typeof EXP_REWARDS;
export type ExpRewardValue = typeof EXP_REWARDS[ExpRewardType]; 