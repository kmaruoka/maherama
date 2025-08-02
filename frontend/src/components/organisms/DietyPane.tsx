import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useParams } from 'react-router-dom';
import { useDietyDetail } from '../../hooks/useDietyDetail';
import useRankingsBundleAll from '../../hooks/useRankingsBundle';
import CustomLink from '../atoms/CustomLink';
import RankingPane from './RankingPane';
import type { Period, RankingItem } from './RankingPane';
import type { RankingsBundleAllPeriods } from '../../hooks/useRankingsBundle';
import { NOIMAGE_DIETY_URL } from '../../constants';
import { FaCloudUploadAlt, FaVoteYea, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import { API_BASE } from '../../config/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../utils/dateFormat';

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

type DetailViewType = 'overview' | 'thumbnail' | 'shrines' | 'ranking' | 'description';

export interface DietyPaneRef {
  backToOverview: () => void;
}

const DietyPane = forwardRef<DietyPaneRef, { id?: number; onShowShrine?: (id: number) => void; onShowUser?: (id: number) => void; onClose?: () => void; onDetailViewChange?: (detailView: DetailViewType) => void }>(
  ({ id, onShowShrine, onShowUser, onClose, onDetailViewChange }, ref) => {
  const { t } = useTranslation();
  const { id: paramId } = useParams<{ id: string }>();
  const [detailView, setDetailView] = useState<DetailViewType>('overview');

  // detailViewが変更されたときに親コンポーネントに通知
  useEffect(() => {
    onDetailViewChange?.(detailView);
  }, [detailView, onDetailViewChange]);
  // id優先、なければparamIdを数値変換して使用
  let idFromParams: number | undefined = undefined;
  if (typeof id === 'number' && !isNaN(id)) {
    idFromParams = id;
  } else if (paramId && !isNaN(Number(paramId))) {
    idFromParams = Number(paramId);
  }

  // デバッグ用ログ
  // console.log('DietyPane: idFromParams', idFromParams, typeof idFromParams);

  const { data: diety, error: dietyError } = useDietyDetail(idFromParams || 0);
  const { data: allRankings, isLoading: isRankingLoading } = useRankingsBundleAll(idFromParams);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(diety?.image_url);
  const [thumbCache, setThumbnailCache] = useState(Date.now());

  useEffect(() => {
    if (diety?.image_url) {
      setThumbnailUrl(diety.image_url);
      setThumbnailCache(Date.now());
    }
  }, [diety?.image_url]);

  const queryClient = useQueryClient();

  // refで外部から呼び出せるメソッドを定義
  useImperativeHandle(ref, () => ({
    backToOverview: () => setDetailView('overview')
  }));

  if (!idFromParams) {
    return <div className="p-3">{t('dietyIdNotSpecified')}</div>;
  }
  if (dietyError) {
    return <div className="p-3 text-danger">{t('dietyInfoError')}</div>;
  }
  if (!diety) {
    return <div className="p-3">{t('loading')}</div>;
  }

  // if (diety) {
  //   console.log('DietyPane: /dieties/:id API response', diety);
  // }

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE}/dieties/${idFromParams}/images/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.isCurrentThumbnail) {
          setThumbnailUrl(result.image.original_url);
          setThumbnailCache(Date.now());
        }
        setIsUploadModalOpen(false);
      } else {
        console.error('画像アップロード失敗');
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
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
      alert(t('voteSuccess'));
    } catch (error) {
      console.error('投票エラー:', error);
      alert(error instanceof Error ? error.message : t('voteError'));
    }
  };

  // 詳細表示のレンダリング関数
  const renderDetailContent = () => {
    if (detailView === 'thumbnail') {
      return (
        <img 
          src={(thumbnailUrl ? thumbnailUrl : NOIMAGE_DIETY_URL) + '?t=' + thumbCache} 
          alt="サムネイル" 
        />
      );
    } else if (detailView === 'shrines') {
      return (
        <>
          <div className="modal-subtitle">
            {t('enshrinedShrines')}
            <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
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
        </>
      );
    } else if (detailView === 'ranking') {
      return (
        <>
          <div className="modal-subtitle">
            {t('prayRanking')}
            <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
          <RankingPane
            itemsByPeriod={getItemsByPeriod(allRankings, 'dietyRankings')}
            type="user"
            isLoading={isRankingLoading}
            onItemClick={onShowUser}
            maxItems={100}
          />
        </>
      );
    } else if (detailView === 'description') {
      return (
        <>
          <div className="modal-subtitle">
            {t('historyAndLegend')}
            <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
          <div className="description-full">
            <p className="text-body-secondary">{diety.description}</p>
          </div>
        </>
      );
    }
    return null;
  };

  if (detailView !== 'overview') {
    return (
      <div onClick={(e) => {
        // リンクやボタン、カスタムリンクがクリックされた場合は通常表示に戻らない
        if ((e.target as HTMLElement).closest('a, button, .custom-link')) {
          return;
        }
        setDetailView('overview');
      }} style={{ cursor: 'pointer', padding: 0, margin: 0, minHeight: '100%' }}>
        {renderDetailContent()}
      </div>
    );
  }

  return (
    <div>
      <div className="pane__header">
        <div className="pane__thumbnail" onClick={(e) => {
          // ボタンがクリックされた場合は画像表示切り替えを行わない
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          setDetailView('thumbnail');
        }} style={{ cursor: 'pointer' }}>
          <img src={(thumbnailUrl ? thumbnailUrl : NOIMAGE_DIETY_URL) + '?t=' + thumbCache} alt="サムネイル" />
          <div className="pane__thumbnail-actions">
            <button className="pane__icon-btn" onClick={(e) => {
              e.stopPropagation();
              setIsUploadModalOpen(true);
            }} title={t('imageUpload')}><FaCloudUploadAlt size={20} /></button>
            {diety.image_url && diety.image_url !== NOIMAGE_DIETY_URL && (
              <button className="pane__icon-btn" onClick={(e) => {
                e.stopPropagation();
                handleVote();
              }} title={t('thumbnailVote')}><FaVoteYea size={20} /></button>
            )}
          </div>
          {diety.image_by && (
            <div className="pane__thumbnail-by">{t('by')} {diety.image_by}</div>
          )}
        </div>
        <div className="pane__info">
          <div className="pane__title">{diety.name}</div>
          {diety.kana && <div className="pane__kana">{diety.kana}</div>}
          <div className="field-row">
            <span className="field-row__label">{t('count')}:</span>
            <span className="field-row__value">{diety.count}</span>
          </div>
        </div>
      </div>

      {/* 歴史・伝承セクション */}
      {diety.description && (
        <div className="modal-section">
          <div className="modal-subtitle" onClick={() => setDetailView('description')} style={{ cursor: 'pointer' }}>
            {t('historyAndLegend')}
            <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
          <div className="description-preview">
            <p className="text-body-secondary small">{diety.description}</p>
          </div>
        </div>
      )}

      <div className="modal-section">
        {diety.registeredAt && (
          <div className="field-row">
            <span className="field-row__label">{t('registeredAt')}:</span>
            <span className="field-row__value">{formatDisplayDate(diety.registeredAt)}</span>
          </div>
        )}

      </div>

      {diety.shrines.length > 0 && (
        <div className="modal-section">
          <div className="modal-subtitle" onClick={() => setDetailView('shrines')} style={{ cursor: 'pointer' }}>
            {t('enshrinedShrines')}
            <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
          <div className="d-flex flex-wrap gap-2">
            {diety.shrines.slice(0, 3).map((shrine) => (
              <CustomLink
                key={shrine.id}
                onClick={() => onShowShrine?.(shrine.id)}
                type="shrine"
              >
                {shrine.name}
              </CustomLink>
            ))}
            {diety.shrines.length > 3 && (
              <span className="text-muted">...{diety.shrines.length - 3}件</span>
            )}
          </div>
        </div>
      )}

      {/* ランキング表示 */}
      <div className="modal-section">
        <div className="modal-subtitle" onClick={() => setDetailView('ranking')} style={{ cursor: 'pointer' }}>
          {t('prayRanking')}
          <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
        </div>
        <RankingPane
          itemsByPeriod={getItemsByPeriod(allRankings, 'dietyRankings')}
          type="user"
          isLoading={isRankingLoading}
          onItemClick={onShowUser}
          maxItems={3}
        />
      </div>

      {/* アップロードモーダル */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleImageUpload}
        title={`${diety?.name || '神様'}の画像をアップロード`}
      />
    </div>
  );
});

export default DietyPane;