import React, { createContext, useEffect, type ReactNode } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState';
import type { SkinName } from './index';
import skins from './index';

const SkinContext = createContext(undefined as unknown as {
  skin: typeof skins.wa;
  skinName: SkinName;
  setSkinName: (name: SkinName) => void;
} | undefined);

export const SkinProvider = ({ children }: { children: ReactNode }) => {
  const [skinName, setSkinName] = useLocalStorageState<SkinName>('skin', 'wa');
  const skin = skins[skinName];

  useEffect(() => {
    const root = document.documentElement;
    const { colors } = skin;
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-shadow', colors.shadow);
    root.style.setProperty('--color-card', colors.card);
    root.style.setProperty('--color-tag-shrine', colors.tagShrine);
    root.style.setProperty('--color-tag-diety', colors.tagDiety);
    root.style.setProperty('--color-tag-user', colors.tagUser);
    root.style.setProperty('--color-tag-shrine-text', colors.tagShrineText);
    root.style.setProperty('--color-tag-diety-text', colors.tagDietyText);
    root.style.setProperty('--color-tag-user-text', colors.tagUserText);
    root.style.setProperty('--border-radius', skin.borderRadius);
    root.style.setProperty('--font-family', skin.fontFamily);
    root.style.setProperty('--box-shadow', skin.boxShadow);
    root.style.setProperty('--modal-max-width', skin.modal.maxWidth);
    root.style.setProperty('--modal-padding', skin.modal.padding);
    root.style.setProperty('--modal-background', skin.modal.background);
    root.style.setProperty('--color-disabled', colors.disabled);
    root.style.setProperty('--color-text-muted', colors.textMuted);
  }, [skin]);
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
