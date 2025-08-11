import React from 'react';
import { useTranslation } from 'react-i18next';
import GridCard from '../atoms/GridCard';
import type { RewardType } from '../atoms/RewardIcon';
import RewardIcon from '../atoms/RewardIcon';

interface MissionGridCardProps {
  mission: {
    id: number;
    name: string;
    content: string;
    progress: number;
    total_required: number;
    exp_reward: number;
    ability_reward: any;
    titles: Array<{
      id: number;
      name: string;
      description: string | null;
    }>;
    is_completed: boolean;
  };
  onClick?: () => void;
}

const MissionGridCard: React.FC<MissionGridCardProps> = ({
  mission,
  onClick
}) => {
  const { t } = useTranslation();

  const progressPercentage = Math.min((mission.progress / mission.total_required) * 100, 100);

  // 報酬を配列として構築
  const rewards: Array<{ type: RewardType; amount: number }> = [];

  // 経験値報酬
  if (mission.exp_reward > 0) {
    rewards.push({ type: 'exp', amount: mission.exp_reward });
  }

  // 能力値報酬
  if (mission.ability_reward) {
    Object.entries(mission.ability_reward).forEach(([abilityId, points]) => {
      rewards.push({ type: 'ability', amount: points as number });
    });
  }

  // 称号報酬
  if (mission.titles && mission.titles.length > 0) {
    rewards.push({ type: 'title', amount: mission.titles.length });
  }

  return (
    <GridCard
      title={mission.name}
      description={mission.content}
      onClick={onClick}
      variant="default"
    >
      <div className="mission-grid-card__content">
        <div className="mission-grid-card__progress">
          <div className="mission-grid-card__progress-bar">
            <div
              className="mission-grid-card__progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mission-grid-card__progress-text">
            {mission.progress} / {mission.total_required}
          </div>
        </div>

        <div className="mission-grid-card__rewards">
          {rewards.map((reward, index) => (
            <div key={index} className="mission-grid-card__reward">
              <RewardIcon type={reward.type} size={12} />
              <span className="mission-grid-card__reward-text">+{reward.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </GridCard>
  );
};

export default MissionGridCard;
