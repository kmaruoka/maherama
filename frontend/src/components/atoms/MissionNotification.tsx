import React, { useEffect, useState } from 'react';
import { useSkin } from '../../skins/SkinContext';
import './MissionNotification.css';
import RewardIcon from './RewardIcon';
import { useTranslation } from 'react-i18next';

interface MissionNotificationProps {
  completedMissions: Array<{
    id: number;
    name: string;
    content: string;
    exp_reward: number;
    ability_reward: any;
  }>;
  onClose: () => void;
}

export const MissionNotification: React.FC<MissionNotificationProps> = ({
  completedMissions,
  onClose
}) => {
  const { skin } = useSkin();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (completedMissions.length > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // アニメーション完了後に閉じる
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [completedMissions, onClose]);

  if (completedMissions.length === 0) return null;

  return (
    <div className={`mission-notification mission-notification--${skin} ${isVisible ? 'mission-notification--visible' : ''}`}>
      <div className="mission-notification__header">
        <h3 className="mission-notification__title">🎉 ミッション達成！</h3>
        <button className="mission-notification__close" onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}>
          ×
        </button>
      </div>

      <div className="mission-notification__content">
        {completedMissions.map(mission => (
          <div key={mission.id} className="mission-notification__mission">
            <h4 className="mission-notification__mission-name">{mission.name}</h4>
            <p className="mission-notification__mission-content">{mission.content}</p>

            <div className="mission-notification__rewards">
              {mission.exp_reward > 0 && (
                <div className="mission-notification__reward">
                  <RewardIcon type="exp" />
                  <span className="mission-notification__reward-text">{t('experience')} +{mission.exp_reward}</span>
                </div>
              )}
              {mission.ability_reward && Object.keys(mission.ability_reward).length > 0 && (
                <div className="mission-notification__reward">
                  <RewardIcon type="ability" />
                  <span className="mission-notification__reward-text">
                    {t('abilityPoints')} +{Object.values(mission.ability_reward as Record<string, number>).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
