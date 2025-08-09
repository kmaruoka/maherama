import React from 'react';
import './virtual-theme.css';

type Props = {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  tokens?: Partial<Record<string, string | number>>;
};

export const VirtualThemeProvider: React.FC<Props> = ({ className, style, children, tokens }) => {
  const cssVars: React.CSSProperties = {};
  if (tokens) {
    for (const [k, v] of Object.entries(tokens)) {
      cssVars[`--${k}` as any] = String(v);
    }
  }
  return (
    <div className={['v-root', className].filter(Boolean).join(' ')} style={{ ...cssVars, ...style }}>
      {children}
    </div>
  );
};
