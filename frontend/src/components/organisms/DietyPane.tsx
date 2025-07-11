import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import useDietyDetail from '../../hooks/useDietyDetail';
import useRankingsBundleAll from '../../hooks/useRankingsBundle';
import CustomLink from '../atoms/CustomLink';
import RankingPane from './RankingPane';
import type { Period, RankingItem } from './RankingPane';
import type { RankingsBundleAllPeriods } from '../../hooks/useRankingsBundle';
import { NOIMAGE_DIETY_URL } from '../../constants';
import { API_BASE } from '../../config/api';
import ImageUploadModal from '../molecules/ImageUploadModal';
import ImageVoteButton from '../atoms/ImageVoteButton';

function getItemsByPeriod(allRankings: RankingsBundleAllPeriods | undefined, key: 'dietyRankings'): { [key in Period]: RankingItem[] } {
  const empty = { all: [], yearly: [], monthly: [], weekly: [] };
  if (!allRankings) return empty;
  return {
    all: allRankings.all?.[key] ?? [],
    yearly: allRankings.yearly?.[key] ?? [],
    monthly: allRankings.monthly?.[key] ?? [],
    weekly: allRankings.weekly?.[key] ?? [],
  };
}

export default function DietyPane({ id, onShowShrine, onShowUser }: { id?: number; onShowShrine?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { id: paramId } = useParams<{ id: string }>();
  const idFromParams = id || paramId;

  // デバッグ用ログ
  console.log('DietyPage - ID from params:', idFromParams, 'Type:', typeof idFromParams);

  const { data: diety, error: dietyError } = useDietyDetail(idFromParams);
  const { data: allRankings, isLoading: isRankingLoading } = useRankingsBundleAll(Number(idFromParams));
  const [showUpload, setShowUpload] = useState(false);

  if (!idFromParams) {
    return <div className="p-3">神様IDが指定されていません</div>;
  }

  if (dietyError) {
    return <div className="p-3 text-danger">神様情報の取得に失敗しました</div>;
  }

  if (!diety) {
    return <div className="p-3">読み込み中...</div>;
  }

  return (
    <>
      <div className="d-flex align-items-start gap-3 mb-4">
        <div style={{ position: 'relative' }}>
          <img
            src={diety.thumbnailUrl ? diety.thumbnailUrl : NOIMAGE_DIETY_URL}
            alt="サムネイル"
            className="rounded shadow"
            style={{ width: '6rem', height: '6rem', objectFit: 'cover' }}
          />
          <button
            className="btn btn-sm btn-light"
            style={{ position: 'absolute', top: 0, right: 0 }}
            onClick={() => setShowUpload(true)}
          >
            ⬆
          </button>
          <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
            <ImageVoteButton voted={false} onVote={() => {}} />
          </div>
        </div>
        <div>
          <div className="modal-title">{diety.name}</div>
          {diety.kana && <div className="modal-kana">{diety.kana}</div>}
          {diety.thumbnailBy && (
            <div className="small text-muted">by {diety.thumbnailBy}</div>
          )}
          <div className="catalog-count modal-item-text small mt-2">参拝数: {diety.count}</div>
        </div>
      </div>

      {diety.shrines.length > 0 && (
        <div className="modal-section">
          <div className="modal-subtitle">祀られている神社</div>
          <div className="d-flex flex-wrap gap-2">
            {diety.shrines.map((shrine) => (
              <CustomLink
                key={shrine.id}
                onClick={() => onShowShrine?.(shrine.id)}
                type="shrine"
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
          itemsByPeriod={getItemsByPeriod(allRankings, 'dietyRankings')}
          type="user"
          isLoading={isRankingLoading}
          onItemClick={onShowUser}
        />
      </div>

      {diety.description && (
        <div className="modal-section">
          <div className="modal-subtitle">説明</div>
          <p className="text-body-secondary small">{diety.description}</p>
        </div>
      )}
      <ImageUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={async (img) => {
          await fetch(`${API_BASE}/dieties/${idFromParams}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: img })
          });
        }}
      />
    </>
  );
}
