import { useQuery } from '@tanstack/react-query';
import type { Period } from '../components/organisms/RankingPane';
import { API_BASE, apiCall } from '../config/api';

export interface DietyRankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function useDietyRankings(id: number | string, period: Period) {
  return useQuery<DietyRankingItem[]>({
    queryKey: ['diety-rankings', id, period],
    queryFn: async () => {
      const res = await apiCall(`${API_BASE}/dieties/${id}/rankings?period=${period}`);
      return res.json();
    },
    enabled: !!id && id !== 'undefined' && id !== '',
  });
}
