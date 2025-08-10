import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { LogItem } from '../components/molecules/CustomLogLine';
import { API_BASE, apiCall } from '../config/api';

export function useClientLogs() {
  const [clientLogs, setClientLogs] = useState<LogItem[]>([]);
  const addClientLog = useCallback((log: LogItem) => {
    setClientLogs((prev) => [...prev, log]);
  }, []);
  const clearClientLogs = useCallback(() => setClientLogs([]), []);
  return { clientLogs, addClientLog, clearClientLogs };
}

export default function useLogs(clientLogs?: LogItem[]) {
  // 開発環境では常に認証済みとして扱う
  const isAuthenticated = import.meta.env.DEV || localStorage.getItem('userId') !== null;

  const { data: serverLogs = [] , ...rest } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/logs`);
      return res.json();
    },
    refetchInterval: 5000,
    retry: 3,
    enabled: isAuthenticated,
  });
  // クライアントログがあれば合成して返す
  return { data: clientLogs ? [...clientLogs, ...serverLogs] : serverLogs, ...rest };
}
