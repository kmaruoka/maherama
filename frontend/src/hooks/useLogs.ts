import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { API_BASE } from '../config/api';
import type { LogItem } from '../components/molecules/CustomLogLine';

export function useClientLogs() {
  const [clientLogs, setClientLogs] = useState<LogItem[]>([]);
  const addClientLog = useCallback((log: LogItem) => {
    setClientLogs((prev) => [...prev, log]);
  }, []);
  const clearClientLogs = useCallback(() => setClientLogs([]), []);
  return { clientLogs, addClientLog, clearClientLogs };
}

export default function useLogs(clientLogs?: LogItem[]) {
  const { data: serverLogs = [] , ...rest } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    refetchInterval: 5000,
    retry: 3,
  });
  // クライアントログがあれば合成して返す
  return { data: clientLogs ? [...clientLogs, ...serverLogs] : serverLogs, ...rest };
}
