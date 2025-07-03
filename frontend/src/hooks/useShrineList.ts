import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface ShrineListItem {
  id: number;
  name: string;
  count: number;
  registeredAt: string;
}

export default function useShrineList() {
  return useQuery<ShrineListItem[]>({
    queryKey: ['shrines'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines`);
      if (!res.ok) throw new Error('Failed to fetch shrines');
      return res.json();
    },
  });
}
