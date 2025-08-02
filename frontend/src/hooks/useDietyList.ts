import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface DietyListItem {
  id: number;
  name: string;
  kana?: string;
  count: number;
  registeredAt: string;
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

export function useDietyList() {
  return useQuery<DietyListItem[]>({
    queryKey: ['dieties'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/dieties`);
      if (!response.ok) {
        throw new Error('Failed to fetch diety list');
      }
      return response.json();
    },
  });
}
