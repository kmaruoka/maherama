import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';
import type { Shrine } from '../components/atoms/ShrineMarker';

export default function useAllShrines() {
  return useQuery<Shrine[]>({
    queryKey: ['shrines-all'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines/all`);
      if (!res.ok) throw new Error('Failed to fetch shrines');
      return res.json();
    },
  });
}
