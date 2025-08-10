import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface AllShrineItem {
  id: number;
  name: string;
  kana?: string;
  location?: string;
  lat: number;
  lng: number;
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
  catalogedAt?: string;
  lastPrayedAt?: string;
  dieties: Array<{
    id: number;
    name: string;
    kana: string;
  }>;
}

export function useAllShrines() {
  return useQuery<AllShrineItem[]>({
    queryKey: ['all-shrines'],
    queryFn: async () => {
      const response = await apiCall(`${API_BASE}/shrines/all`);
      return response.json();
    },
  });
}
