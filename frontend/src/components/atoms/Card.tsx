import React from 'react';
import './Card.css';

export interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'custom';
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  disabled?: boolean;
  style?: React.CSSProperties;
  role?: string;
  'aria-label'?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  onClick,
  className = '',
  size = 'medium',
  variant = 'default',
  disabled = false,
  style,
  role,
  'aria-label': ariaLabel
}) => {
  const cardClasses = [
    'card',
    `card--${size}`,
    `card--${variant}`,
    onClick && !disabled ? 'card--clickable' : '',
    disabled ? 'card--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      role={role || (onClick ? 'button' : undefined)}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
};

export default Card;
