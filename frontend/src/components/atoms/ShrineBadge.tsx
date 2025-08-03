import React from 'react';
import { GiShintoShrine } from 'react-icons/gi';
import './Badge.css';

export interface ShrineBadgeProps {
  rank: number;
  size?: number;
  className?: string;
}

const ShrineBadge: React.FC<ShrineBadgeProps> = ({ 
  rank, 
  size = 20,
  className = ''
}) => {
  const getBadgeClass = () => {
    if (rank === 1) return 'award-badge gold';
    if (rank === 2) return 'award-badge silver';
    if (rank === 3) return 'award-badge bronze';
    return 'award-badge';
  };

  return (
    <span className={`shrine-badge ${getBadgeClass()} ${className}`}>
      <GiShintoShrine size={size} />
    </span>
  );
};

export default ShrineBadge; 