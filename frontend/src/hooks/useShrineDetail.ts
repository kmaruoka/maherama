import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface ShrineDetail {
  id: number;
  name: string;
  kana?: string;
  location: string;
  lat: number;
  lng: number;
  registeredAt: string;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
  founded?: string;
  history?: string;
  festivals?: string;
  description?: string;
  count: number;
  dieties: Array<{
    id: number;
    name: string;
    kana?: string;
  }>;
}

export function useShrineDetail(id: number) {
  return useQuery<ShrineDetail>({
    queryKey: ['shrine', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shrine detail');
      }
      return response.json();
    },
    enabled: !!id,
  });
}
