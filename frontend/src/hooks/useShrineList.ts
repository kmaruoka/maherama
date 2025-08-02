import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface ShrineListItem {
  id: number;
  name: string;
  kana?: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
  image_id?: number;
  image_url?: string;
  image_url64?: string;
  image_url128?: string;
  image_url256?: string;
  image_url512?: string;
  image_by?: string;
}

export function useShrineList() {
  return useQuery<ShrineListItem[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/shrines`);
      if (!response.ok) {
        throw new Error('Failed to fetch shrine list');
      }
      return response.json();
    },
  });
}
