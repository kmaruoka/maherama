import React from 'react';
import './CustomLink.css';

export default function CustomLink({ onClick, children, className = '', type = 'default' }: { onClick?: () => void; children: React.ReactNode; className?: string; type?: 'default' | 'shrine' | 'diety' | 'user' }) {
  const typeClass =
    type === 'shrine' ? 'tag-link tag-shrine' :
    type === 'diety' ? 'tag-link tag-diety' :
    type === 'user' ? 'tag-link tag-user' :
    'custom-link';
  return (
    <div
      className={`${typeClass}${className ? ' ' + className : ''}`.trim()}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
