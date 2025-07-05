import { useState } from 'react';
import useShrineDetail from '../../hooks/useShrineDetail';
import useShrineRankings from '../../hooks/useShrineRankings';
import CustomLink from '../atoms/CustomLink';
import RankingPane from '../organisms/RankingPane';
import type { Period } from '../organisms/RankingPane';

export default function ShrinePage({ id, onShowDiety, onShowUser }: { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const { data } = useShrineDetail(id);

  const { data: rankings = [] } = useShrineRankings(id, selectedPeriod);

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
          <div className="text-muted small mt-2">参拝数: {data.count}</div>
        </div>
      </div>
      
      <div className="small text-muted mb-4">{data.location}</div>
      
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
      
      <div className="text-muted small">登録日: {data.registeredAt}</div>
    </>
  );
}
