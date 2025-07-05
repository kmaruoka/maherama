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
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="modal-content">
      <div className="flex items-start space-x-4 mb-4">
        <img
          src={data.thumbnailUrl ? data.thumbnailUrl : '/images/noimage-shrine.png'}
          alt="サムネイル"
          className="w-24 h-24 object-contain rounded shadow"
        />
        <div>
          <div className="modal-title">{data.name}</div>
          {data.kana && <div className="modal-kana">{data.kana}</div>}
          <div className="text-xs text-gray-500 mt-2">参拝数: {data.count}</div>
        </div>
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
