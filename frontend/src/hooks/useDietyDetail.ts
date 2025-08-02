import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface DietyDetail {
  id: number;
  name: string;
  kana?: string;
  description?: string;
  catalogedAt?: string;
  lastPrayedAt?: string;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
  count: number;
  shrines: Array<{
    id: number;
    name: string;
    kana?: string;
  }>;
}

export function useDietyDetail(id: number) {
  return useQuery<DietyDetail>({
    queryKey: ['diety', id],
    queryFn: async () => {
      const response = await apiCall(`${API_BASE}/dieties/${id}`);
      return response.json();
    },
    enabled: !!id,
  });
}
