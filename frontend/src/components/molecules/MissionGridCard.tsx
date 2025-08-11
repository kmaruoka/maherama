import React from 'react';
import { useTranslation } from 'react-i18next';
import GridCard from '../atoms/GridCard';
import type { RewardType } from '../atoms/RewardIcon';
import RewardIcon from '../atoms/RewardIcon';

interface MissionGridCardProps {
  mission: {
    id: number;
    name: string;
    description: string;
    progress: number;
    target: number;
    rewards: Array<{
      type: RewardType;
      amount: number;
    }>;
    completed: boolean;
  };
  onClick?: () => void;
}

const MissionGridCard: React.FC<MissionGridCardProps> = ({
  mission,
  onClick
}) => {
  const { t } = useTranslation();

  const progressPercentage = Math.min((mission.progress / mission.target) * 100, 100);

  return (
    <GridCard
      title={mission.name}
      description={mission.description}
      onClick={onClick}
      size="small"
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
            {mission.progress} / {mission.target}
          </div>
        </div>

        <div className="mission-grid-card__rewards">
          {mission.rewards.map((reward, index) => (
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
