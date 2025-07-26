import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../config/api';

export interface ShrineMarkerStatus {
  shrine_id: number;
  total_pray_count: number;
  is_in_zukan: boolean;
  has_prayed_today: boolean;
  can_remote_pray: boolean;
  pray_distance: number;
  max_worship_count: number;
  today_worship_count: number;
}

export function useShrineMarkerStatus(shrineId: number | null, userId: number | null) {
  return useQuery<ShrineMarkerStatus>({
    queryKey: ['shrine-marker-status', shrineId, userId],
    queryFn: async () => {
      if (!shrineId || !userId) throw new Error('神社IDまたはユーザーIDが未設定です');
      const res = await fetch(`${API_BASE}/shrines/${shrineId}/marker-status`, {
        headers: { 'x-user-id': String(userId) },
      });
      if (!res.ok) throw new Error('神社マーカー状態の取得に失敗しました');
      return res.json();
    },
    enabled: !!shrineId && !!userId,
    staleTime: 30000, // 30秒間はキャッシュを使用
    gcTime: 60000, // 1分間キャッシュを保持
    retry: 2, // エラー時に2回リトライ
    refetchOnWindowFocus: false, // ウィンドウフォーカス時に再取得しない
  });
} 