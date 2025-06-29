import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import CustomText from '../atoms/CustomText';
import { API_BASE } from '../../config/api';
import CustomLink from '../atoms/CustomLink';

export interface Shrine {
  id: number;
  name: string;
  kana?: string;
  location: string;
  lat: number;
  lng: number;
  count: number;
  thumbnailUrl?: string;
  thumbnailBy?: string;
  founded?: string;
  history?: string;
  festivals?: string;
  description?: string;
  dieties: Array<{ id: number; name: string; kana?: string }>;
}

interface RankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function ShrineMarkerPane({ shrine, refetchLogs, onShowDetail }: { shrine: Shrine; refetchLogs: () => void; onShowDetail?: (id: number) => void; }) {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'yearly' | 'monthly' | 'weekly'>('all');
  
  const { data: rankings = [] } = useQuery<RankingItem[]>({
    queryKey: ['shrine-rankings-popup', shrine.id, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${shrine.id}/rankings?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('ランキング取得に失敗しました');
      return response.json();
    },
  });

  const periods = [
    { key: 'all', label: '総合' },
    { key: 'yearly', label: '年間' },
    { key: 'monthly', label: '月間' },
    { key: 'weekly', label: '週間' },
  ];

  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/shrines/${id}/pray`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines'] });
      refetchLogs();
    },
  });

  const remotePrayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${shrine.id}/remote-pray`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '遥拝に失敗しました');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines'] });
      refetchLogs();
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="modal-header">
          <CustomLink type="shrine" onClick={() => onShowDetail && onShowDetail(shrine.id)} className="modal-title">
            {shrine.name}
          </CustomLink>
          {shrine.kana && <div className="modal-kana">{shrine.kana}</div>}
        </div>
      </div>
      <div className="modal-info">
        <div>参拝数: <span className="font-bold">{shrine.count}</span></div>
      </div>

      {shrine.thumbnailUrl && (
        <div className="mb-4">
          <img
            src={shrine.thumbnailUrl}
            alt={shrine.name}
            className="w-full h-32 object-cover rounded"
          />
          {shrine.thumbnailBy && (
            <p className="text-xs text-gray-500 mt-1">by {shrine.thumbnailBy}</p>
          )}
        </div>
      )}

      <div className="mb-4">
        {shrine.founded && <p className="text-sm text-gray-600 mb-2">創建: {shrine.founded}</p>}
      </div>

      {shrine.history && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">歴史・伝承</h4>
          <p className="text-sm text-gray-700">{shrine.history}</p>
        </div>
      )}

      {shrine.festivals && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">祭礼</h4>
          <p className="text-sm text-gray-700">{shrine.festivals}</p>
        </div>
      )}

      {shrine.description && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">説明</h4>
          <p className="text-sm text-gray-700">{shrine.description}</p>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          className="px-2 py-1 bg-blue-500 text-white rounded"
          onClick={() => prayMutation.mutate(shrine.id)}
        >
          参拝
        </button>
        <button
          className="px-2 py-1 bg-green-500 text-white rounded"
          onClick={() => remotePrayMutation.mutate()}
          disabled={remotePrayMutation.isPending}
        >
          {remotePrayMutation.isPending ? '遥拝中...' : '遥拝'}
        </button>
        {remotePrayMutation.error && (
          <p className="text-red-500 text-sm mt-2">{remotePrayMutation.error.message}</p>
        )}
      </div>
    </div>
  );
} 