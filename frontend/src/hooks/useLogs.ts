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
  const { data: serverLogs = [] , ...rest } = useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/logs`);
      return res.json();
    },
    refetchInterval: 30000, // 30秒に変更（5秒から）
    staleTime: 10000, // 10秒間はキャッシュを使用
    retry: 2, // エラー時に2回リトライ
    retryDelay: 1000, // リトライ間隔1秒
  });
  // クライアントログがあれば合成して返す
  return { data: clientLogs ? [...clientLogs, ...serverLogs] : serverLogs, ...rest };
}
