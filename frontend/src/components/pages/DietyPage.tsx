import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';

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

const DietyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'yearly' | 'monthly' | 'weekly'>('all');

  // デバッグ用ログ
  console.log('DietyPage - ID from params:', id, 'Type:', typeof id);

  const { data: diety, error: dietyError } = useQuery<Diety>({
    queryKey: ['diety', id],
    queryFn: async () => {
      console.log('Fetching diety with ID:', id);
      const response = await fetch(`${API_BASE}/dieties/${id}`);
      if (!response.ok) throw new Error('神情報取得に失敗しました');
      return response.json();
    },
    enabled: !!id && id !== 'undefined' && id !== '',
  });

  const { data: rankings = [], error: rankingsError } = useQuery<RankingItem[]>({
    queryKey: ['diety-rankings', id, selectedPeriod],
    queryFn: async () => {
      console.log('Fetching rankings with ID:', id, 'Period:', selectedPeriod);
      const response = await fetch(`${API_BASE}/dieties/${id}/rankings?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('ランキング取得に失敗しました');
      return response.json();
    },
    enabled: !!id && id !== 'undefined' && id !== '',
  });

  const periods = [
    { key: 'all', label: '全期間' },
    { key: 'yearly', label: '年間' },
    { key: 'monthly', label: '月間' },
    { key: 'weekly', label: '週間' },
  ];

  if (!id) {
    return <div className="p-4">神IDが指定されていません</div>;
  }

  if (dietyError) {
    return <div className="p-4 text-red-500">神情報の取得に失敗しました</div>;
  }

  if (!diety) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-2">{diety.name}</h1>
        {diety.kana && <p className="text-lg text-gray-600 mb-4">{diety.kana}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">基本情報</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">参拝数:</span>
                <p className="text-gray-700">{diety.count}回</p>
              </div>
            </div>

            {diety.shrines.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">祀られている神社</h3>
                <div className="flex flex-wrap gap-2">
                  {diety.shrines.map((shrine) => (
                    <span
                      key={shrine.id}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {shrine.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">参拝ランキング</h2>
            
            {/* 期間選択タブ */}
            <div className="flex border-b mb-4">
              {periods.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key as any)}
                  className={`px-4 py-2 text-sm ${
                    selectedPeriod === period.key
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* ランキング一覧 */}
            <div className="space-y-3">
              {rankings.length > 0 ? (
                rankings.map((item) => (
                  <div key={item.userId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                        item.rank === 2 ? 'bg-gray-300 text-gray-700' :
                        item.rank === 3 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {item.rank}
                      </span>
                      <span className="font-medium">{item.userName}</span>
                    </div>
                    <span className="text-gray-600 font-semibold">{item.count}回</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">データがありません</p>
              )}
            </div>
          </div>
        </div>

        {diety.description && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">説明</h2>
            <p className="text-gray-700 leading-relaxed">{diety.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DietyPage;
