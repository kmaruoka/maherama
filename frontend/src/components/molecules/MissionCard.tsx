import React from 'react';
import './MissionCard.css';

export interface MissionCardProps {
  mission: {
    id: number;
    name: string;
    content: string;
    progress: number;
    total_required: number;
    is_completed: boolean;
    exp_reward: number;
    ability_reward: any;
    mission_type: 'permanent' | 'event';
  };
  onClick?: () => void;
  className?: string;
}

const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onClick,
  className = ''
}) => {
  const progressPercentage = mission.total_required > 0 
    ? Math.min((mission.progress / mission.total_required) * 100, 100) 
    : 0;

  const totalAbilityPoints = mission.ability_reward && 
    typeof mission.ability_reward === 'object' && 
    Object.keys(mission.ability_reward).length > 0
    ? Object.values(mission.ability_reward as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div
      className={`mission-card ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`ミッション: ${mission.name}`}
    >
      <div className="mission-card__header">
        <div className="mission-card__title">{mission.name}</div>
        {mission.is_completed && (
          <span className="mission-card__completed">達成済み</span>
        )}
      </div>
      
      <div className="mission-card__body">
        <div className="mission-card__content">{mission.content}</div>
        
        <div className="mission-card__progress">
          <div className="mission-card__progress-bar">
            <div 
              className="mission-card__progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mission-card__progress-text">
            {mission.progress} / {mission.total_required}
          </div>
        </div>

        <div className="mission-card__rewards">
          {mission.exp_reward > 0 && (
            <div className="mission-card__reward">
              <span className="mission-card__reward-icon">⭐</span>
              <span className="mission-card__reward-text">経験値 +{mission.exp_reward}</span>
            </div>
          )}
          {totalAbilityPoints > 0 && (
            <div className="mission-card__reward">
              <span className="mission-card__reward-icon">🔧</span>
              <span className="mission-card__reward-text">能力ポイント +{totalAbilityPoints}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionCard; 