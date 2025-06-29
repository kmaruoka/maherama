import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';

interface Shrine {
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

const ShrineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'yearly' | 'monthly' | 'weekly'>('all');

  const { data: shrine, error: shrineError } = useQuery<Shrine>({
    queryKey: ['shrine', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${id}`);
      if (!response.ok) throw new Error('神社情報取得に失敗しました');
      return response.json();
    },
    enabled: !!id,
  });

  const { data: rankings = [], error: rankingsError } = useQuery<RankingItem[]>({
    queryKey: ['shrine-rankings', id, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${id}/rankings?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('ランキング取得に失敗しました');
      return response.json();
    },
    enabled: !!id,
  });

  const periods = [
    { key: 'all', label: '全期間' },
    { key: 'yearly', label: '年間' },
    { key: 'monthly', label: '月間' },
    { key: 'weekly', label: '週間' },
  ];

  useEffect(() => {
    console.log('フロント shrine:', shrine);
    console.log('フロント shrineError:', shrineError);
  }, [shrine, shrineError]);

  if (!id) {
    return <div className="p-4">神社IDが指定されていません</div>;
  }

  if (shrineError) {
    return <div className="p-4 text-red-500">神社情報の取得に失敗しました</div>;
  }

  if (!shrine) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div style={{ background: '#ffdddd', color: '#900', fontSize: '14px', padding: '8px', marginBottom: '8px', border: '2px solid #f00' }}>
        【shrineデバッグ表示】
        <pre style={{ background: 'inherit', color: 'inherit', fontSize: '12px', padding: 0, margin: 0, overflowX: 'auto' }}>
          {JSON.stringify(shrine, null, 2)}
        </pre>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-2">{shrine.name}</h1>
        {shrine.kana && <p className="text-lg text-gray-600 mb-4">{shrine.kana}</p>}

        {shrine.thumbnailUrl && (
          <div className="mb-6">
            <img
              src={shrine.thumbnailUrl}
              alt={shrine.name}
              className="w-full h-48 object-cover rounded-lg"
            />
            {shrine.thumbnailBy && (
              <p className="text-sm text-gray-500 mt-2">by {shrine.thumbnailBy}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">基本情報</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">所在地:</span>
                <p className="text-gray-700">{shrine.location}</p>
              </div>
              {shrine.founded && (
                <div>
                  <span className="font-medium">創建:</span>
                  <p className="text-gray-700">{shrine.founded}</p>
                </div>
              )}
              <div>
                <span className="font-medium">参拝数:</span>
                <p className="text-gray-700">{shrine.count}回</p>
              </div>
            </div>

            {shrine.dieties.length > 0 && (
              <>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">祭神</h3>
                  <div className="flex flex-wrap gap-2">
                    {shrine.dieties.map((diety) => (
                      <span
                        key={diety.id}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {diety.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
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

        {shrine.history && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">歴史・伝承</h2>
            <p className="text-gray-700 leading-relaxed">{shrine.history}</p>
          </div>
        )}

        {shrine.festivals && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">祭礼</h2>
            <p className="text-gray-700 leading-relaxed">{shrine.festivals}</p>
          </div>
        )}

        {shrine.description && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">説明</h2>
            <p className="text-gray-700 leading-relaxed">{shrine.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShrineDetailPage;
