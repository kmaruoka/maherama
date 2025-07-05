import { useCallback } from 'react';

let debugLogListeners: ((logs: string[]) => void)[] = [];
let debugLogs: string[] = [];

export function subscribeDebugLogs(listener: (logs: string[]) => void) {
  debugLogListeners.push(listener);
  listener(debugLogs);
  return () => {
    debugLogListeners = debugLogListeners.filter(l => l !== listener);
  };
}

export function addDebugLog(msg: string, debugMode: boolean) {
  if (!debugMode) return;
  debugLogs.push(msg);
  if (debugLogs.length > 100) debugLogs = debugLogs.slice(-100);
  debugLogListeners.forEach(l => l(debugLogs));
}

export default function useDebugLog(debugMode: boolean) {
  return useCallback((msg: string) => addDebugLog(msg, debugMode), [debugMode]);
} 