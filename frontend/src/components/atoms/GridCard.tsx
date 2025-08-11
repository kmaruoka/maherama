import React from 'react';
import './GridCard.css';

export interface GridCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  onClick?: () => void;
  children?: React.ReactNode; // カスタム内容用
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'elevated';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const GridCard: React.FC<GridCardProps> = ({
  title,
  description,
  imageUrl,
  onClick,
  children,
  size = 'medium',
  variant = 'default',
  disabled = false,
  className = '',
  style
}) => {
  const cardClasses = [
    'grid-card',
    `grid-card--${size}`,
    `grid-card--${variant}`,
    onClick && !disabled ? 'grid-card--clickable' : '',
    disabled ? 'grid-card--disabled' : '',
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
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={title}
      aria-disabled={disabled}
    >
      {imageUrl && (
        <div className="grid-card__thumbnail">
          <img src={imageUrl} alt={title} />
        </div>
      )}

      <div className="grid-card__body">
        <div className="grid-card__title">{title}</div>
        {description && <div className="grid-card__description">{description}</div>}
        {children}
      </div>
    </div>
  );
};

export default GridCard;
