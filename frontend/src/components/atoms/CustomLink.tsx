import React from 'react';
import './CustomLink.css';

export default function CustomLink({ onClick, children, className = '', type = 'default' }: { onClick?: () => void; children: React.ReactNode; className?: string; type?: 'default' | 'shrine' | 'diety' | 'user' | 'mission' }) {
  const typeClass =
    type === 'shrine' ? 'tag-link tag-shrine' :
    type === 'diety' ? 'tag-link tag-diety' :
    type === 'user' ? 'tag-link tag-user' :
    type === 'mission' ? 'tag-link tag-mission' :
    'custom-link';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // イベント伝播を停止
    if (onClick) {
      onClick();
    }
  };

  return (
    <span
      className={`${typeClass}${className ? ' ' + className : ''}`.trim()}
      onClick={handleClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {children}
    </span>
  );
}
