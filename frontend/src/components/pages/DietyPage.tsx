import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import useDietyDetail from '../../hooks/useDietyDetail';
import useDietyRankings from '../../hooks/useDietyRankings';
import CustomLink from '../atoms/CustomLink';
import RankingPane from '../organisms/RankingPane';
import type { Period, RankingItem } from '../organisms/RankingPane';

interface Diety {
  id: number;
  name: string;
  kana?: string;
  description?: string;
  count: number;
  shrines: Array<{ id: number; name: string; kana?: string }>;
}

export default function DietyPage({ id, onShowShrine, onShowUser }: { id?: number; onShowShrine?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { id: paramId } = useParams<{ id: string }>();
  const idFromParams = id || paramId;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');

  // デバッグ用ログ
  console.log('DietyPage - ID from params:', idFromParams, 'Type:', typeof idFromParams);

  const { data: diety, error: dietyError } = useDietyDetail(idFromParams);

  const { data: rankings = [] } = useDietyRankings(idFromParams!, selectedPeriod);

  const periods = [
    { key: 'all', label: '総合' },
    { key: 'yearly', label: '年間' },
    { key: 'monthly', label: '月間' },
    { key: 'weekly', label: '週間' },
  ];

  if (!idFromParams) {
    return <div className="p-4">神様IDが指定されていません</div>;
  }

  if (dietyError) {
    return <div className="p-4 text-red-500">神様情報の取得に失敗しました</div>;
  }

  if (!diety) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="modal-content">
      <div className="flex items-center space-x-4 mb-4">
        <div className="modal-header">
          <div className="modal-title">{diety.name}</div>
          {diety.kana && <div className="modal-kana">{diety.kana}</div>}
        </div>
      </div>

      <div className="modal-info">
        <div>参拝数: <span className="font-bold">{diety.count}</span></div>
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

      {diety.description && (
        <div className="modal-section">
          <div className="modal-subtitle">説明</div>
          <p className="text-gray-700 leading-relaxed">{diety.description}</p>
        </div>
      )}
    </div>
  );
}
