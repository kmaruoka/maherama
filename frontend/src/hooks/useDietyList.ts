import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface DietyListItem {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

export default function useDietyList() {
  return useQuery<DietyListItem[]>({
    queryKey: ['dieties'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dieties`);
      if (!res.ok) throw new Error('Failed to fetch dieties');
      return res.json();
    },
  });
}
