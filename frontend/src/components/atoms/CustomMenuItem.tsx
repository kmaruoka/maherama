import React from 'react';

export default function CustomMenuItem({ onClick, children, active }: { onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`custom-menu-item text-center py-2 flex-fill${active ? ' active' : ''}`}
      style={{ color: 'var(--color-text)' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
