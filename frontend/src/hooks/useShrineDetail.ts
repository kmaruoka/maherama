import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface ShrineDetail {
  id: number;
  name: string;
  kana?: string;
  location: string;
  lat: number;
  lng: number;
  count: number;
  registeredAt: string;
  thumbnailUrl?: string;
  thumbnailBy?: string;
  founded?: string;
  history?: string;
  festivals?: string;
  description?: string;
  dieties: Array<{ id: number; name: string; kana?: string }>;
}

export default function useShrineDetail(id?: number) {
  return useQuery<ShrineDetail | null>({
    queryKey: ['shrine', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
  });
}
