import React, { createContext, useState, type ReactNode } from 'react';
import skins from './index';
import type { SkinName } from './index';

const SkinContext = createContext(undefined as unknown as {
  skin: typeof skins.wa;
  skinName: SkinName;
  setSkinName: (name: SkinName) => void;
} | undefined);

export const SkinProvider = ({ children }: { children: ReactNode }) => {
  const [skinName, setSkinName] = useState<SkinName>('wa');
  const skin = skins[skinName];
  return (
    <SkinContext.Provider value={{ skin, skinName, setSkinName }}>
      {children}
    </SkinContext.Provider>
  );
};

export function useSkin() {
  const ctx = React.useContext(SkinContext);
  if (!ctx) throw new Error('useSkin must be used within a SkinProvider');
  return ctx;
} 