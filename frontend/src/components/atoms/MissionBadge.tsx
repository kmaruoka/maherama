import React from 'react';
import { GiLaurelCrown } from 'react-icons/gi';
import './Badge.css';

export interface MissionBadgeProps {
  rank: number;
  size?: number;
  className?: string;
  missionImageUrl?: string; // ミッション専用アイコンがある場合のURL
}

const MissionBadge: React.FC<MissionBadgeProps> = ({ 
  rank, 
  size = 20,
  className = '',
  missionImageUrl
}) => {
  const getBadgeClass = () => {
    if (rank === 1) return 'award-badge gold';
    if (rank === 2) return 'award-badge silver';
    if (rank === 3) return 'award-badge bronze';
    return 'award-badge';
  };

  const getIcon = () => {
    // ミッション専用アイコンがある場合はそれを使用
    if (missionImageUrl) {
      return <img src={missionImageUrl} alt="Mission" style={{ width: size, height: size }} />;
    }
    // デフォルトはAwardアイコン
    return <GiLaurelCrown size={size} />;
  };

  return (
    <span className={`mission-badge ${getBadgeClass()} ${className}`}>
      {getIcon()}
    </span>
  );
};

export default MissionBadge; 