import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import CustomLink from '../atoms/CustomLink';

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
}

interface RankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function ShrinePage({ id, onShowDiety, onShowUser }: { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'yearly' | 'monthly' | 'weekly'>('all');
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

  // ダミー祭神リスト（本来はAPIで取得）
  const dietyList = [
    { id: 1, name: '天照大御神' },
    { id: 2, name: '月読命' },
  ];

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
        <div>
          <div className="modal-title text-2xl">{data.name}</div>
          {data.kana && <div className="text-gray-400 text-sm">{data.kana}</div>}
        </div>
      </div>
      
      <div className="modal-info">
        <div>参拝数: <span className="font-bold">{data.count}</span></div>
        <div>緯度: {data.lat}</div>
        <div>経度: {data.lng}</div>
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
          {dietyList.map(d => (
            <CustomLink
              key={d.id}
              onClick={() => onShowDiety && onShowDiety(d.id)}
              className="tag-link tag-diety"
            >
              {d.name}
            </CustomLink>
          ))}
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
        <div className="flex border-b mb-3">
          {periods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key as any)}
              className={`px-2 py-1 text-xs ${
                selectedPeriod === period.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rankings.slice(0, 3).map((item) => (
            <div key={item.userId} className="modal-item">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  item.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                  item.rank === 2 ? 'bg-gray-300 text-gray-700' :
                  item.rank === 3 ? 'bg-orange-400 text-orange-900' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {item.rank}
                </span>
                <CustomLink onClick={() => onShowUser && onShowUser(item.userId)} className="tag-link tag-user">{item.userName}</CustomLink>
              </div>
              <span className="modal-item-text">{item.count}回</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <p className="text-gray-500 text-center py-4 text-xs">データがありません</p>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-400">登録日: {data.registeredAt}</div>
    </div>
  );
}
