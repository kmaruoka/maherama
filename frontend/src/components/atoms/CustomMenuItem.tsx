import React from 'react';

export default function CustomMenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="flex-fill btn btn-link text-center py-2"
      style={{ color: 'var(--color-text)' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
