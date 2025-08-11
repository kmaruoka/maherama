import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, apiCall } from '../config/api';

export interface TravelLog {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
  };
}

export interface TravelLogsResponse {
  logs: TravelLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface TravelLogPostData {
  content: string;
}

// 神社の旅の記録を取得
export function useShrineTravelLogs(shrineId: number | undefined, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['shrine-travel-logs', shrineId, page, limit],
    queryFn: async (): Promise<TravelLogsResponse> => {
      if (!shrineId) throw new Error('Shrine ID is required');
      const response = await apiCall(`${API_BASE}/shrines/${shrineId}/travel-logs?page=${page}&limit=${limit}`);
      return response.json();
    },
    enabled: !!shrineId,
  });
}

// 神様の旅の記録を取得
export function useDietyTravelLogs(dietyId: number | undefined, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['diety-travel-logs', dietyId, page, limit],
    queryFn: async (): Promise<TravelLogsResponse> => {
      if (!dietyId) throw new Error('Diety ID is required');
      const response = await apiCall(`${API_BASE}/dieties/${dietyId}/travel-logs?page=${page}&limit=${limit}`);
      return response.json();
    },
    enabled: !!dietyId,
  });
}

// 神社の旅の記録を投稿
export function usePostShrineTravelLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shrineId, data }: { shrineId: number; data: TravelLogPostData }): Promise<TravelLog> => {
      const response = await apiCall(`${API_BASE}/shrines/${shrineId}/travel-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data, { shrineId }) => {
      // 関連するクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['shrine-travel-logs', shrineId] });
    },
  });
}

// 神様の旅の記録を投稿
export function usePostDietyTravelLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dietyId, data }: { dietyId: number; data: TravelLogPostData }): Promise<TravelLog> => {
      const response = await apiCall(`${API_BASE}/dieties/${dietyId}/travel-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data, { dietyId }) => {
      // 関連するクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['diety-travel-logs', dietyId] });
    },
  });
}
