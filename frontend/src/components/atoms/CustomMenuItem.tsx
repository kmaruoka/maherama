import React from 'react';

export default function CustomMenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="flex-1 py-2 text-center" onClick={onClick}>
      {children}
    </button>
  );
}
