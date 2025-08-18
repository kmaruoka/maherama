import React, { createContext, type ReactNode } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState';
import type { BarrierName } from './index';
import barriers from './index';

const BarrierContext = createContext(undefined as unknown as {
  barrierName: BarrierName;
  setBarrierName: (name: BarrierName) => void;
  barrier: { name: string; className: string };
} | undefined);

export const BarrierProvider = ({ children }: { children: ReactNode }) => {
  const [barrierName, setBarrierName] = useLocalStorageState<BarrierName>('barrier', 'search');
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
