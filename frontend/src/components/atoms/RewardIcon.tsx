import React from 'react';
import { FaSuperpowers, FaBoltLightning, FaAward } from 'react-icons/fa6';
import './RewardIcon.css';

export type RewardType = 'exp' | 'ability' | 'title';

interface RewardIconProps {
  type: RewardType;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RewardIcon: React.FC<RewardIconProps> = ({ 
  type, 
  size = 18, 
  className = '', 
  style = {} 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'exp':
        return <FaSuperpowers size={size} />;
      case 'ability':
        return <FaBoltLightning size={size} />;
      case 'title':
        return <FaAward size={size} />;
      default:
        return null;
    }
  };

  return (
    <span 
      className={`reward-icon reward-icon--${type} ${className}`}
      style={style}
    >
      {getIcon()}
    </span>
  );
};

export default RewardIcon; 