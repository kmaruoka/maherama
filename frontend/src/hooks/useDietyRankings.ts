import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period } from '../components/organisms/RankingPane';

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
      const res = await fetch(`${API_BASE}/dieties/${id}/rankings?period=${period}`);
      if (!res.ok) throw new Error('ランキング取得に失敗しました');
      return res.json();
    },
    enabled: !!id && id !== 'undefined' && id !== '',
  });
}
