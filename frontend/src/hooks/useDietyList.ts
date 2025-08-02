import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface DietyListItem {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
  image_id?: number;
  image_url?: string;
  image_url64?: string;
  image_url128?: string;
  image_url256?: string;
  image_url512?: string;
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
