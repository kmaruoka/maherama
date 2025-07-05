import useShrineDetail from '../../hooks/useShrineDetail';
import CustomLink from '../atoms/CustomLink';
import RankingPane from '../organisms/RankingPane';
import type { Period, RankingItem } from '../organisms/RankingPane';
import { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';

function useShrineUserRankingsBundle(shrineId: number | undefined): { data: { [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }, isLoading: boolean } {
  const [data, setData] = useState<{ [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }>({ all: [], yearly: [], monthly: [], weekly: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shrineId) return;
    setLoading(true);
    fetch(`${API_BASE}/shrines/${shrineId}/rankings-bundle`)
      .then(res => res.json())
      .then(json => setData(json))
      .finally(() => setLoading(false));
  }, [shrineId]);
  return { data, isLoading: loading };
}

// userRankingsByPeriodのuserName→name変換
function convertUserRankingsByPeriod(data: { [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }): { [key in Period]: RankingItem[] } {
  const result: { [key in Period]: RankingItem[] } = { all: [], yearly: [], monthly: [], weekly: [] };
  for (const period of ['all', 'yearly', 'monthly', 'weekly'] as Period[]) {
    result[period] = (data[period] || []).map(item => ({
      ...item,
      id: item.userId,
      name: item.userName
    }));
  }
  return result;
}

export default function ShrinePage({ id, onShowDiety, onShowUser }: { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { data } = useShrineDetail(id);
  const { data: userRankingsByPeriod, isLoading: isRankingLoading } = useShrineUserRankingsBundle(id);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (!data) {
    return <div className="p-3">Loading...</div>;
  }

  return (
    <>
      <div className="d-flex align-items-start gap-3 mb-4">
        <img
          src={data.thumbnailUrl ? data.thumbnailUrl : '/images/noimage-shrine.png'}
          alt="サムネイル"
          className="rounded shadow"
          style={{ width: '6rem', height: '6rem', objectFit: 'contain' }}
        />
        <div>
          <div className="modal-title">{data.name}</div>
          {data.kana && <div className="modal-kana">{data.kana}</div>}
          <div className="catalog-count modal-item-text small mt-2">参拝数: {data.count}</div>
        </div>
      </div>
      
      <div className="small modal-item-text mb-4">{data.location}</div>
      
      {data.founded && (
        <div className="modal-section">
          <div className="modal-subtitle">創建</div>
          <div>{data.founded}</div>
        </div>
      )}
      
      {data.description && (
        <div className="modal-section">
          <div className="modal-subtitle">説明</div>
          <div className="small text-body-secondary">{data.description}</div>
        </div>
      )}
      
      <div className="modal-section">
        <div className="modal-subtitle">祭神</div>
        <div className="d-flex flex-wrap gap-2">
          {data.dieties && data.dieties.length > 0 ? (
            data.dieties.map(d => (
              <CustomLink
                key={d.id}
                onClick={() => onShowDiety && onShowDiety(d.id)}
                type="diety"
              >
                {d.name}
              </CustomLink>
            ))
          ) : (
            <span className="text-muted">祭神情報なし</span>
          )}
        </div>
      </div>
      
      {data.history && (
        <div className="modal-section">
          <div className="modal-subtitle">歴史・伝承</div>
          <div className="small">{data.history}</div>
        </div>
      )}
      
      {data.festivals && (
        <div className="modal-section">
          <div className="modal-subtitle">祭礼</div>
          <div className="small">{data.festivals}</div>
        </div>
      )}

      {/* ランキング表示 */}
      <div className="modal-section">
        <div className="modal-subtitle">参拝ランキング</div>
        <RankingPane
          itemsByPeriod={convertUserRankingsByPeriod(userRankingsByPeriod)}
          type="user"
          isLoading={isRankingLoading}
          onItemClick={onShowUser}
        />
      </div>
      
      <div className="text-muted small">収録日: {formatDate(data.registeredAt)}</div>
    </>
  );
}
