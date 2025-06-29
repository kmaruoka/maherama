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
    <div className="p-4 space-y-2 max-w-md mx-auto">
      <div className="flex items-center space-x-4">
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
      <div className="text-sm text-gray-300">{data.location}</div>
      {data.founded && <div>創建: {data.founded}</div>}
      {data.description && <div className="text-sm text-gray-200">{data.description}</div>}
      <div className="mt-2">
        <div className="font-bold">祭神</div>
        <ul className="list-disc ml-6">
          {dietyList.map(d => (
            <li key={d.id}>
              <CustomLink type="diety" onClick={() => onShowDiety && onShowDiety(d.id)}>{d.name}</CustomLink>
            </li>
          ))}
        </ul>
      </div>
      {data.history && <div><span className="font-bold">歴史・伝承</span><div className="text-sm">{data.history}</div></div>}
      {data.festivals && <div><span className="font-bold">祭礼</span><div className="text-sm">{data.festivals}</div></div>}
      <div className="flex space-x-4 mt-2">
        <div>参拝数: <span className="font-bold">{data.count}</span></div>
        <div>緯度: {data.lat}</div>
        <div>経度: {data.lng}</div>
      </div>
      <div className="text-xs text-gray-400">登録日: {data.registeredAt}</div>

      {/* ランキング表示 */}
      <div className="mt-4">
        <h4 className="font-semibold mb-2">参拝ランキング</h4>
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
            <div key={item.userId} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  item.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                  item.rank === 2 ? 'bg-gray-300 text-gray-700' :
                  item.rank === 3 ? 'bg-orange-400 text-orange-900' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {item.rank}
                </span>
                <CustomLink type="user" onClick={() => onShowUser && onShowUser(item.userId)}>{item.userName}</CustomLink>
              </div>
              <span className="text-gray-600 font-semibold">{item.count}回</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <p className="text-gray-500 text-center py-4 text-xs">データがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
