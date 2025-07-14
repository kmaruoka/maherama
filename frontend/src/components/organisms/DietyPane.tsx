import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useDietyDetail from '../../hooks/useDietyDetail';
import useRankingsBundleAll from '../../hooks/useRankingsBundle';
import CustomLink from '../atoms/CustomLink';
import RankingPane from './RankingPane';
import type { Period, RankingItem } from './RankingPane';
import type { RankingsBundleAllPeriods } from '../../hooks/useRankingsBundle';
import { NOIMAGE_DIETY_URL } from '../../constants';
import { FaCloudUploadAlt, FaVoteYea } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import { API_BASE } from '../../config/api';
import { useQueryClient } from '@tanstack/react-query';

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
  // id優先、なければparamIdを数値変換して使用
  let idFromParams: number | undefined = undefined;
  if (typeof id === 'number' && !isNaN(id)) {
    idFromParams = id;
  } else if (paramId && !isNaN(Number(paramId))) {
    idFromParams = Number(paramId);
  }

  // デバッグ用ログ
  // console.log('DietyPane: idFromParams', idFromParams, typeof idFromParams);

  const { data: diety, error: dietyError } = useDietyDetail(idFromParams);
  const { data: allRankings, isLoading: isRankingLoading } = useRankingsBundleAll(idFromParams);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [thumbCache, setThumbCache] = useState(Date.now());
  const [thumbnailUrl, setThumbnailUrl] = useState(diety?.thumbnailUrl);

  useEffect(() => {
    setThumbnailUrl(diety?.thumbnailUrl);
  }, [diety?.thumbnailUrl]);

  const queryClient = useQueryClient();

  if (!idFromParams) {
    return <div className="p-3">神様IDが指定されていません</div>;
  }

  if (dietyError) {
    return <div className="p-3 text-danger">神様情報の取得に失敗しました</div>;
  }

  if (!diety) {
    return <div className="p-3">読み込み中...</div>;
  }

  if (diety) {
    console.log('DietyPane: /dieties/:id API response', diety);
  }

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${API_BASE}/dieties/${idFromParams}/images/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': '1', // 開発用
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('アップロード失敗');
      }
      
      const result = await response.json();
      
      // 成功時はデータ再取得
      queryClient.invalidateQueries({ queryKey: ['diety-detail', idFromParams] });
      if (result.image?.thumbnail_url) {
        setThumbnailUrl(result.image.thumbnail_url);
        setThumbCache(Date.now());
      }
      setThumbCache(Date.now()); // キャッシュバスターを更新
      
      // 即採用された場合のメッセージ
      if (result.isCurrentThumbnail) {
        alert('画像がアップロードされ、即座にサムネイルとして採用されました！');
      } else {
        alert('画像がアップロードされました。投票期間後に審査されます。');
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert('アップロードに失敗しました。');
    }
  };

  const handleVote = async () => {
    try {
      const response = await fetch(`${API_BASE}/dieties/${idFromParams}/images/vote`, {
        method: 'POST',
        headers: {
          'x-user-id': '1', // 開発用
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        let errorMsg = '投票失敗';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          const text = await response.text();
          if (text.startsWith('<!DOCTYPE')) {
            errorMsg = 'サーバーエラーまたはAPIが見つかりません';
          } else {
            errorMsg = text;
          }
        }
        throw new Error(errorMsg);
      }
      
      // 成功時はデータ再取得
      // setRefreshKey(prev => prev + 1); // This line was removed as per the new_code
      alert('投票しました！');
    } catch (error) {
      console.error('投票エラー:', error);
      alert(error instanceof Error ? error.message : '投票に失敗しました。');
    }
  };

  return (
    <>
      <div className="d-flex align-items-start gap-3 mb-4">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={(thumbnailUrl ? thumbnailUrl : NOIMAGE_DIETY_URL) + '?t=' + thumbCache} alt="サムネイル" style={{ width: 256, height: 256, objectFit: 'cover', borderRadius: 8 }} />
          {/* 右上ボタン */}
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer' }} 
              title="画像アップロード"
            >
              <FaCloudUploadAlt size={20} />
            </button>
            {diety.thumbnailUrl && diety.thumbnailUrl !== NOIMAGE_DIETY_URL && (
              <button 
                onClick={handleVote}
                style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer' }} 
                title="サムネイル投票"
              >
                <FaVoteYea size={20} />
              </button>
            )}
          </div>
          {/* 左下 byユーザー */}
          {diety.thumbnailBy && (
            <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
              by {diety.thumbnailBy}
            </div>
          )}
        </div>
        <div>
          <div className="modal-title">{diety.name}</div>
          {diety.kana && <div className="modal-kana">{diety.kana}</div>}
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

      {/* アップロードモーダル */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        title={`${diety?.name || '神様'}の画像をアップロード`}
      />
    </>
  );
}