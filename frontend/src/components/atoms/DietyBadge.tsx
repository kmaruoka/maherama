import React from 'react';
import { GiLibertyWing } from 'react-icons/gi';
import './Badge.css';

export interface DietyBadgeProps {
  rank: number;
  size?: number;
  className?: string;
}

const DietyBadge: React.FC<DietyBadgeProps> = ({ 
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
    <span className={`diety-badge ${getBadgeClass()} ${className}`}>
      <GiLibertyWing size={size} />
    </span>
  );
};

export default DietyBadge; 