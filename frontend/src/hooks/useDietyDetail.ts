import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface DietyDetail {
  id: number;
  name: string;
  kana?: string;
  description?: string;
  count: number;
  shrines: Array<{ id: number; name: string; kana?: string }>;
}

export default function useDietyDetail(id?: number | string) {
  return useQuery<DietyDetail | null>({
    queryKey: ['diety', id],
    enabled: !!id && id !== 'undefined' && id !== '',
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dieties/${id}`);
      if (!res.ok) throw new Error('神様情報取得に失敗しました');
      return res.json();
    },
  });
}
