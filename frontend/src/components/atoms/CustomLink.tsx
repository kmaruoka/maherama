import React from 'react';

export default function CustomLink({ onClick, children, className }: { onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <span className={`underline cursor-pointer ${className || ''}`.trim()} onClick={onClick}>
      {children}
    </span>
  );
}
