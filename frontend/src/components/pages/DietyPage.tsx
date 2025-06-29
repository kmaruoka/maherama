import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import CustomLink from '../atoms/CustomLink';

interface Diety {
  id: number;
  name: string;
  kana?: string;
  description?: string;
  count: number;
  shrines: Array<{ id: number; name: string; kana?: string }>;
}

interface RankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function DietyPage({ id, onShowShrine, onShowUser }: { id?: number; onShowShrine?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { id: paramId } = useParams<{ id: string }>();
  const idFromParams = id || paramId;
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'yearly' | 'monthly' | 'weekly'>('all');

  // デバッグ用ログ
  console.log('DietyPage - ID from params:', idFromParams, 'Type:', typeof idFromParams);

  const { data: diety, error: dietyError } = useQuery<Diety>({
    queryKey: ['diety', idFromParams],
    queryFn: async () => {
      console.log('Fetching diety with ID:', idFromParams);
      const response = await fetch(`${API_BASE}/dieties/${idFromParams}`);
      if (!response.ok) throw new Error('神情報取得に失敗しました');
      return response.json();
    },
    enabled: !!idFromParams && idFromParams !== 'undefined' && idFromParams !== '',
  });

  const { data: rankings = [] } = useQuery<RankingItem[]>({
    queryKey: ['diety-rankings-modal', idFromParams, selectedPeriod],
    queryFn: async () => {
      console.log('Fetching rankings with ID:', idFromParams, 'Period:', selectedPeriod);
      const response = await fetch(`${API_BASE}/dieties/${idFromParams}/rankings?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('ランキング取得に失敗しました');
      return response.json();
    },
    enabled: !!idFromParams && idFromParams !== 'undefined' && idFromParams !== '',
  });

  const periods = [
    { key: 'all', label: '総合' },
    { key: 'yearly', label: '年間' },
    { key: 'monthly', label: '月間' },
    { key: 'weekly', label: '週間' },
  ];

  if (!idFromParams) {
    return <div className="p-4">神IDが指定されていません</div>;
  }

  if (dietyError) {
    return <div className="p-4 text-red-500">神情報の取得に失敗しました</div>;
  }

  if (!diety) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="modal-content">
      <h1 className="modal-title text-2xl mb-4">
        {diety.name}
      </h1>
      {diety.kana && <p className="text-lg text-gray-600 mb-4">{diety.kana}</p>}

      <div className="modal-info">
        <div>参拝数: <span className="font-bold">{diety.count}回</span></div>
      </div>

      {diety.shrines.length > 0 && (
        <div className="modal-section">
          <div className="modal-subtitle">祀られている神社</div>
          <div className="flex flex-wrap gap-2">
            {diety.shrines.map((shrine) => (
              <CustomLink
                key={shrine.id}
                onClick={() => onShowShrine?.(shrine.id)}
                className="tag-link tag-shrine"
              >
                {shrine.name}
              </CustomLink>
            ))}
          </div>
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
                <CustomLink onClick={() => onShowUser?.(item.userId)} className="tag-link tag-user">{item.userName}</CustomLink>
              </div>
              <span className="modal-item-text">{item.count}回</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <p className="text-gray-500 text-center py-4 text-xs">データがありません</p>
          )}
        </div>
      </div>

      {diety.description && (
        <div className="modal-section">
          <div className="modal-subtitle">説明</div>
          <p className="text-gray-700 leading-relaxed">{diety.description}</p>
        </div>
      )}
    </div>
  );
}
