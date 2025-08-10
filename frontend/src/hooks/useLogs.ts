import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { LogItem } from '../components/molecules/CustomLogLine';
import { API_BASE, useSecureAuth } from '../config/api';

export function useClientLogs() {
  const [clientLogs, setClientLogs] = useState<LogItem[]>([]);
  const addClientLog = useCallback((log: LogItem) => {
    setClientLogs((prev) => [...prev, log]);
  }, []);
  const clearClientLogs = useCallback(() => setClientLogs([]), []);
  return { clientLogs, addClientLog, clearClientLogs };
}

export default function useLogs(clientLogs?: LogItem[]) {
  const { isAuthenticated } = useSecureAuth();

  const { data: serverLogs = [] , ...rest } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    refetchInterval: 5000,
    retry: 3,
    enabled: isAuthenticated,
  });
  // クライアントログがあれば合成して返す
  return { data: clientLogs ? [...clientLogs, ...serverLogs] : serverLogs, ...rest };
}
