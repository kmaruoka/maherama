import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Period } from '../components/organisms/RankingPane';

export interface ShrineRankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function useShrineRankings(id: number, period: Period) {
  return useQuery<ShrineRankingItem[]>({
    queryKey: ['shrine-rankings', id, period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines/${id}/rankings?period=${period}`);
      if (!res.ok) throw new Error('ランキング取得に失敗しました');
      return res.json();
    },
    enabled: !!id,
  });
}
