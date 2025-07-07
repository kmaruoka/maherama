import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import barriers from './index';
import type { BarrierName } from './index';
import useLocalStorageState from '../hooks/useLocalStorageState';

const BarrierContext = createContext(undefined as unknown as {
  barrierName: BarrierName;
  setBarrierName: (name: BarrierName) => void;
  barrier: { name: string; className: string };
} | undefined);

export const BarrierProvider = ({ children }: { children: ReactNode }) => {
  const [barrierName, setBarrierName] = useLocalStorageState<BarrierName>('barrier', 'normal');
  const barrier = barriers[barrierName];

  return (
    <BarrierContext.Provider value={{ barrierName, setBarrierName, barrier }}>
      {children}
    </BarrierContext.Provider>
  );
};

export function useBarrier() {
  const ctx = React.useContext(BarrierContext);
  if (!ctx) throw new Error('useBarrier must be used within a BarrierProvider');
  return ctx;
}
