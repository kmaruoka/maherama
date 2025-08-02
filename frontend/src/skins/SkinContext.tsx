import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import skins from './index';
import type { SkinName } from './index';
import useLocalStorageState from '../hooks/useLocalStorageState';

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
    root.style.setProperty('--color-log-text', colors.logText);
    root.style.setProperty('--color-section', colors.section);
    root.style.setProperty('--border-radius', skin.borderRadius);
    root.style.setProperty('--font-family', skin.fontFamily);
    root.style.setProperty('--box-shadow', skin.boxShadow);
    root.style.setProperty('--modal-max-width', skin.modal.maxWidth);
    root.style.setProperty('--modal-padding', skin.modal.padding);
    root.style.setProperty('--modal-background', skin.modal.background);
    root.style.setProperty('--color-scrollbar-thumb', colors.scrollbarThumb);
    root.style.setProperty('--color-scrollbar-track', colors.scrollbarTrack);
    root.style.setProperty('--color-scrollbar-thumb-hover', colors.scrollbarThumbHover);
    root.style.setProperty('--color-tab-inactive', colors.tabInactive);
    root.style.setProperty('--color-ranking-tab-bg', colors.rankingTabBg);
    root.style.setProperty('--color-ranking-tab-active-bg', colors.rankingTabActiveBg);
    root.style.setProperty('--color-ranking-row-bg', colors.rankingRowBg);
    root.style.setProperty('--color-ranking-row-border', colors.rankingRowBorder);
    root.style.setProperty('--color-ranking-section', colors.rankingSection);
    root.style.setProperty('--color-ranking-badge-1', colors.rankingBadge1);
    root.style.setProperty('--color-ranking-badge-2', colors.rankingBadge2);
    root.style.setProperty('--color-ranking-badge-3', colors.rankingBadge3);
    root.style.setProperty('--color-ranking-badge-other', colors.rankingBadgeOther);
    root.style.setProperty('--color-ranking-badge-text', colors.rankingBadgeText);
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