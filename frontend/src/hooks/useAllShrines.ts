import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiCall } from '../config/api';

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
  // クエリオプションをメモ化して不要な再レンダリングを防ぐ
  const queryOptions = useMemo(() => ({
    queryKey: ['all-shrines'] as const,
    queryFn: async () => {
      const response = await apiCall(`/shrines/all`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュを使用
    gcTime: 10 * 60 * 1000, // ガベージコレクション時間を10分に設定
    retry: 2, // エラー時に2回リトライ
    retryDelay: 1000, // リトライ間隔1秒
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnReconnect: false, // 再接続時の再取得を無効化
    refetchOnMount: false, // マウント時の再取得を無効化（キャッシュがあれば使用）
  }), []);

  return useQuery<AllShrineItem[]>(queryOptions);
}
