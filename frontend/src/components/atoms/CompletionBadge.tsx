import React from 'react';
import './Badge.css';

export interface CompletionBadgeProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const CompletionBadge: React.FC<CompletionBadgeProps> = ({ 
  size = 20,
  className = '',
  style = {}
}) => {
  return (
    <span 
      className={`badge badge-mission ${className}`}
      style={{
        '--badge-size': `${size}px`,
        ...style
      } as React.CSSProperties}
    >
      ✓
    </span>
  );
};

export default CompletionBadge; 