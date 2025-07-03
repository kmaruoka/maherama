import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { LogItem } from '../components/molecules/CustomLogLine';

export default function useLogs() {
  return useQuery<LogItem[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    refetchInterval: 5000,
    retry: 3,
  });
}
