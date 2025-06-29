import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import CustomLink from '../atoms/CustomLink';
import RankingPane from '../organisms/RankingPane';
import type { Period, RankingItem } from '../organisms/RankingPane';

interface Shrine {
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

export default function ShrinePage({ id, onShowDiety, onShowUser }: { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const { data } = useQuery<Shrine | null>({
    queryKey: ['shrine', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/shrines/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: rankings = [] } = useQuery<RankingItem[]>({
    queryKey: ['shrine-rankings-modal', id, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${id}/rankings?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('ランキング取得に失敗しました');
      return response.json();
    },
    enabled: !!id,
  });

  const periods = [
    { key: 'all', label: '総合' },
    { key: 'yearly', label: '年間' },
    { key: 'monthly', label: '月間' },
    { key: 'weekly', label: '週間' },
  ];

  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="modal-content">
      <div className="flex items-center space-x-4 mb-4">
        {data.thumbnailUrl && (
          <div className="relative">
            <img src={data.thumbnailUrl} alt="サムネイル" className="w-24 h-24 object-contain rounded shadow" />
            {data.thumbnailBy && (
              <div className="absolute left-1 bottom-1 bg-black bg-opacity-60 text-xs text-white px-1 rounded">by {data.thumbnailBy}</div>
            )}
          </div>
        )}
        <div className="modal-header">
          <div className="modal-title">{data.name}</div>
          {data.kana && <div className="modal-kana">{data.kana}</div>}
        </div>
      </div>
      
      <div className="modal-info">
        <div>参拝数: <span className="font-bold">{data.count}</span></div>
      </div>
      
      <div className="text-sm text-gray-300 mb-4">{data.location}</div>
      
      {data.founded && (
        <div className="modal-section">
          <div className="modal-subtitle">創建</div>
          <div>{data.founded}</div>
        </div>
      )}
      
      {data.description && (
        <div className="modal-section">
          <div className="modal-subtitle">説明</div>
          <div className="text-sm text-gray-200">{data.description}</div>
        </div>
      )}
      
      <div className="modal-section">
        <div className="modal-subtitle">祭神</div>
        <div className="flex flex-wrap gap-2">
          {data.dieties && data.dieties.length > 0 ? (
            data.dieties.map(d => (
              <CustomLink
                key={d.id}
                onClick={() => onShowDiety && onShowDiety(d.id)}
                className="tag-link tag-diety"
              >
                {d.name}
              </CustomLink>
            ))
          ) : (
            <span className="text-gray-400">祭神情報なし</span>
          )}
        </div>
      </div>
      
      {data.history && (
        <div className="modal-section">
          <div className="modal-subtitle">歴史・伝承</div>
          <div className="text-sm">{data.history}</div>
        </div>
      )}
      
      {data.festivals && (
        <div className="modal-section">
          <div className="modal-subtitle">祭礼</div>
          <div className="text-sm">{data.festivals}</div>
        </div>
      )}

      {/* ランキング表示 */}
      <div className="modal-section">
        <div className="modal-subtitle">参拝ランキング</div>
        <RankingPane
          items={rankings.map(item => ({
            id: item.userId,
            name: item.userName,
            count: item.count,
            rank: item.rank
          }))}
          type="user"
          period={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          onItemClick={onShowUser}
        />
      </div>
      
      <div className="text-xs text-gray-400">登録日: {data.registeredAt}</div>
    </div>
  );
}
