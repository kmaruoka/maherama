import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface Mission {
  id: number;
  name: string;
  content: string;
  mission_type: 'permanent' | 'event';
  start_at: string | null;
  end_at: string | null;
  exp_reward: number;
  ability_reward: any;
  progress: number;
  total_required: number;
  is_completed: boolean;
  completed_at: string | null;
  shrines: {
    id: number;
    name: string;
    location: string;
    count: number;
    achieved: number;
    is_completed: boolean;
  }[];
  dieties: {
    id: number;
    name: string;
    count: number;
    achieved: number;
    is_completed: boolean;
  }[];
  titles: {
    id: number;
    name: string;
    description: string | null;
  }[];
}

export function useMissions() {
  return useQuery({
    queryKey: ['missions'],
    queryFn: async (): Promise<Mission[]> => {
      const response = await apiCall(`${API_BASE}/missions`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュを使用（0から変更）
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    retry: 2, // エラー時に2回リトライ
    retryDelay: 1000, // リトライ間隔1秒
  });
}
