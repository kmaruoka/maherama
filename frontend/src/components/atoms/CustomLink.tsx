import React from 'react';
import './CustomLink.css';

export default function CustomLink({ onClick, children, className = '', type = 'default' }: { onClick?: () => void; children: React.ReactNode; className?: string; type?: 'default' | 'shrine' | 'diety' | 'user' }) {
  return (
    <span
      className={`custom-link custom-link-${type} ${className}`.trim()}
      onClick={onClick}
    >
      {'<'}{children}{'>'}
    </span>
  );
}
