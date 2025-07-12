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

export function addDebugLog(msg: string) {
  console.log(msg);
  debugLogs.push(msg);
  if (debugLogs.length > 100) debugLogs = debugLogs.slice(-100);
  debugLogListeners.forEach(l => l(debugLogs));
}

export default function useDebugLog() {
  return useCallback((msg: string) => {
    const now = new Date();
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    const timestamp = `${now.toISOString()}.${ms}`;
    //console.log(`%c[DEBUG] [${timestamp}] ${msg}`, 'color: #1976d2; font-weight: bold;');
  }, []);
} 