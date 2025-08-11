import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface ShrineListItem {
  id: number;
  name: string;
  kana?: string;
  count: number;
  catalogedAt: string;
  lastPrayedAt?: string;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
}

export function useShrineList() {
  return useQuery<ShrineListItem[]>({
    queryKey: ['shrines-visited'],
    queryFn: async () => {
      console.log('[useShrineList] 神社一覧取得開始');
      const response = await apiCall(`${API_BASE}/users/me/shrines-visited`);
      const data = await response.json();
      console.log('[useShrineList] 神社一覧取得成功:', data.length, '件');
      return data;
    },
    retry: 1,
    retryDelay: 1000,
  });
}
