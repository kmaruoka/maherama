import React, { forwardRef, useImperativeHandle } from 'react';
import { useShrineDetail } from '../../hooks/useShrineDetail';
import CustomLink from '../atoms/CustomLink';
import RankingPane from './RankingPane';
import type { Period, RankingItemData } from './RankingPane';
import { useState, useEffect } from 'react';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import ImageVoteButton from '../atoms/ImageVoteButton';
import { API_BASE } from '../../config/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useDebugLog from '../../hooks/useDebugLog';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import { useSubscription } from '../../hooks/useSubscription';
import { NOIMAGE_SHRINE_URL, NOIMAGE_SHRINE_DISPLAY_URL } from '../../constants';
import { getDistanceMeters } from '../../hooks/usePrayDistance';
import { formatDistance } from '../../../backend/shared/utils/distance';
import { useWorshipLimit } from '../../hooks/usePrayDistance';
import { useShrineMarkerStatus } from '../../hooks/useShrineMarkerStatus';
import { FaCloudUploadAlt, FaVoteYea, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { CustomButton } from '../atoms/CustomButton';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../utils/dateFormat';
import { useToast } from '../atoms';
import { useImageManagement } from '../../hooks/useImageManagement';
import { ManagedImage } from '../atoms/ManagedImage';

function useShrineUserRankingsBundle(shrineId: number | undefined, refreshKey: number): { data: { [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }, isLoading: boolean } {
  const [data, setData] = useState<{ [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }>({ all: [], yearly: [], monthly: [], weekly: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shrineId) return;
    setLoading(true);
    fetch(`${API_BASE}/shrines/${shrineId}/rankings-bundle`)
      .then(res => res.json())
      .then(json => setData(json))
      .finally(() => setLoading(false));
  }, [shrineId, refreshKey]);
  return { data, isLoading: loading };
}

// userRankingsByPeriodのuserName→name変換
function convertUserRankingsByPeriod(data: { [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }): { [key in Period]: RankingItemData[] } {
  const result: { [key in Period]: RankingItemData[] } = { all: [], yearly: [], monthly: [], weekly: [] };
  for (const period of ['all', 'yearly', 'monthly', 'weekly'] as Period[]) {
    result[period] = (data[period] || []).map(item => ({
      ...item,
      id: item.userId,
      name: item.userName
    }));
  }
  return result;
}

type DetailViewType = 'overview' | 'thumbnail' | 'deities' | 'ranking';

export interface ShrinePaneRef {
  backToOverview: () => void;
}

const ShrinePane = forwardRef<ShrinePaneRef, { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void; onClose?: () => void; onDetailViewChange?: (detailView: DetailViewType) => void }>(
  ({ id, onShowDiety, onShowUser, onClose, onDetailViewChange }, ref) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data } = useShrineDetail(id);
  const [rankRefreshKey, setRankRefreshKey] = useState(0);
  const { data: userRankingsByPeriod, isLoading: isRankingLoading } = useShrineUserRankingsBundle(id, rankRefreshKey);
  const queryClient = useQueryClient();
  const [userId] = useLocalStorageState<number | null>('userId', null);
  const { data: subscription } = useSubscription(userId);
  const debugLog = useDebugLog();
  const position = useCurrentPosition();
  const [debugMode] = useLocalStorageState('debugMode', false);
  const [debugCenter, setDebugCenter] = useState<[number, number] | null>(null);
  const [prayDistance, setPrayDistance] = useState<number | null>(null);
  const [detailView, setDetailView] = useState<DetailViewType>('overview');

  // detailViewが変更されたときに親コンポーネントに通知
  useEffect(() => {
    onDetailViewChange?.(detailView);
  }, [detailView, onDetailViewChange]);
  const { data: worshipLimit } = useWorshipLimit(userId);
  const { data: markerStatus } = useShrineMarkerStatus(id, userId);
  const [imageList, setImageList] = useState<any[]>([]);
  const [imageListLoading, setImageListLoading] = useState(false);
  const [imageListError, setImageListError] = useState<string | null>(null);

  // 画像管理フックを使用
  const [imageState, imageActions] = useImageManagement({
    entityType: 'shrine',
    entityId: id,
    userId: userId || undefined,
    noImageUrl: NOIMAGE_SHRINE_DISPLAY_URL,
    queryKeys: ['shrine', String(id), 'shrines-all']
  });

  // refで外部から呼び出せるメソッドを定義
  useImperativeHandle(ref, () => ({
    backToOverview: () => setDetailView('overview')
  }));

  useEffect(() => {
    if (data?.image_url || data?.image_url_m || data?.image_url_s || data?.image_url_l) {
      // データが更新されたら画像状態をリセット
      imageActions.resetImageState();
      
      // 画像をプリロードしてちらつきを防ぐ
      const imageUrl = data.image_url_l || data.image_url_m || data.image_url || data.image_url_s;
      if (imageUrl && imageUrl !== NOIMAGE_SHRINE_DISPLAY_URL) {
        const img = new Image();
        img.src = imageUrl + '?t=' + Date.now();
      }
    }
  }, [data?.image_url, data?.image_url_m, data?.image_url_s, data?.image_url_l]);

  // 画像リスト取得
  useEffect(() => {
    if (!id) return;
    setImageListLoading(true);
    // 前月のYYYYMMを計算
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyymm = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    fetch(`${API_BASE}/shrines/${id}/images?votingMonth=${yyyymm}`)
      .then(res => res.json())
      .then(json => setImageList(json))
      .catch(e => setImageListError(t('imageListError')))
      .finally(() => setImageListLoading(false));
  }, [id, rankRefreshKey, t]);

  const handleUpload = async (file: File) => {
    await imageActions.handleUpload(file);
    setRankRefreshKey(prev => prev + 1);
  };

  const handleVote = async () => {
    await imageActions.handleVote();
    setRankRefreshKey(prev => prev + 1);
  };

  // 追加: 参拝距離をAPIから取得
  useEffect(() => {
    if (userId) {
      fetch(`${API_BASE}/users/${userId}/pray-distance`, {
        headers: { 'x-user-id': String(userId) }
      })
        .then(res => res.json())
        .then(data => {
          if (typeof data.pray_distance === 'number') {
            setPrayDistance(data.pray_distance);
          }
        });
    }
  }, [userId]);

  // デバッグモード時の地図中心位置を取得
  useEffect(() => {
    if (debugMode) {
      // 地図の中心位置を取得するため、MapPageから渡された情報を使用
      // または、localStorageから保存された位置を取得
      const savedCenter = localStorage.getItem('debugMapCenter');
      if (savedCenter) {
        try {
          const center = JSON.parse(savedCenter);
          setDebugCenter(center);
        } catch (e) {
          debugLog('[ERROR] デバッグ中心位置の解析に失敗');
        }
      }

      // localStorageの変更を監視
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'debugMapCenter' && e.newValue) {
          try {
            const center = JSON.parse(e.newValue);
            setDebugCenter(center);
          } catch (e) {
            debugLog('[ERROR] デバッグ中心位置の解析に失敗');
          }
        }
      };

      // 定期的にlocalStorageをチェック（リアルタイム更新のため）
      const interval = setInterval(() => {
        const savedCenter = localStorage.getItem('debugMapCenter');
        if (savedCenter) {
          try {
            const center = JSON.parse(savedCenter);
            setDebugCenter(prev => {
              if (!prev || prev[0] !== center[0] || prev[1] !== center[1]) {
                return center;
              }
              return prev;
            });
          } catch (e) {
            debugLog('[ERROR] デバッグ中心位置の解析に失敗');
          }
        }
      }, 100); // 100ms間隔でチェック

      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    } else {
      setDebugCenter(null);
    }
  }, [debugMode, debugLog]);

  // 現在位置を決定（デバッグモード時は地図中心、通常時はGPS位置）
  const currentPosition = debugMode ? debugCenter : position;

  // 距離計算（Haversine公式）
  function getRadiusFromSlots(slots: number) {
    if (slots === 0) return 100;
    return 100 * Math.pow(2, slots);
  }

  // 参拝可能かどうかを判定
  const radius = prayDistance !== null ? prayDistance : getRadiusFromSlots(0);
  const distance = (currentPosition && data) ? getDistanceMeters(currentPosition[0], currentPosition[1], data.lat, data.lng) : null;
  
  // 距離判定（小数点誤差を吸収して比較）
  const canPray = distance !== null && 
    !isNaN(distance) && 
    !isNaN(radius) && 
    distance <= radius;

  // デバッグ情報を出力
  // useEffect(() => {
  //   if (currentPosition && data) {
  //     const d = getDistanceMeters(currentPosition[0], currentPosition[1], data.lat, data.lng);
  //     debugLog(`神社: ${data.name} | 現在位置: [${currentPosition[0]}, ${currentPosition[1]}] | 神社位置: [${data.lat}, ${data.lng}] | 距離: ${formatDistance(d)} (typeof: ${typeof d}) | 半径: ${formatDistance(radius)} (typeof: ${typeof radius}) | 参拝可能: ${canPray} | デバッグモード: ${debugMode}`);
  //   }
  // }, [currentPosition, data, radius, canPray, debugMode, debugLog]);

  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      let body = undefined;
      if (currentPosition) {
        body = JSON.stringify({ lat: currentPosition[0], lng: currentPosition[1] });
      }
      const res = await fetch(`${API_BASE}/shrines/${id}/pray`, {
        method: 'POST',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          'x-user-id': String(userId || 1)
        },
        body,
      });
      if (!res.ok) {
        const error = await res.json();
        debugLog(`[ERROR] 参拝失敗: ${error.error || '不明なエラー'}`);
        throw new Error(error.error || t('prayError'));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // ミッション進捗も更新
      queryClient.refetchQueries({ queryKey: ['missions'] }); // 即座に再取得
      setRankRefreshKey(k => k + 1); // ランキングも再取得
    },
    onSettled: async () => {
      // 成功・失敗にかかわらずmarker-statusを再取得してボタン状態を更新
      try {
        // 即座にキャッシュをクリアして再取得
        queryClient.removeQueries({ queryKey: ['shrine-marker-status', id, userId] });
        await queryClient.refetchQueries({ queryKey: ['shrine-marker-status', id, userId] });
      } catch (error) {
        console.error('Failed to refetch marker status:', error);
      }
    },
  });

  const remotePrayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${id}/remote-pray`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId || 1)
        },
      });
      let error;
      try {
        error = await response.json();
      } catch (e) {
        error = {};
      }
      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(t('serverError'));
        } else {
          throw new Error(error.error || t('remotePrayError'));
        }
      }
      return error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // ミッション進捗も更新
      queryClient.refetchQueries({ queryKey: ['missions'] }); // 即座に再取得
      setRankRefreshKey(k => k + 1); // ランキングも再取得
    },
    onSettled: async () => {
      // 成功・失敗にかかわらずmarker-statusを再取得してボタン状態を更新
      try {
        // 即座にキャッシュをクリアして再取得
        queryClient.removeQueries({ queryKey: ['shrine-marker-status', id, userId] });
        await queryClient.refetchQueries({ queryKey: ['shrine-marker-status', id, userId] });
      } catch (error) {
        console.error('Failed to refetch marker status:', error);
      }
    },
  });


  if (!data) {
    return <div className="p-3">{t('loading')}</div>;
  }

  // 画像ごとの投票
  const handleImageVote = async (imageId: number) => {
    try {
      const response = await fetch(`${API_BASE}/shrines/${id}/images/${imageId}/vote`, {
        method: 'POST',
        headers: {
          'x-user-id': String(userId || 1),
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
      setRankRefreshKey(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['shrine', id] });
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      showToast(t('voteSuccess'), 'success');
    } catch (error) {
      console.error('投票エラー:', error);
      showToast(error instanceof Error ? error.message : t('voteError'), 'error');
    }
  };

  // 詳細表示のレンダリング関数
  const renderDetailContent = () => {
    if (detailView === 'thumbnail') {
      return (
        <ManagedImage
          src={(data.image_url_l || data.image_url_m || data.image_url || NOIMAGE_SHRINE_DISPLAY_URL) + '?t=' + imageState.thumbCache}
          alt="サムネイル"
          fallbackSrc={NOIMAGE_SHRINE_DISPLAY_URL}
          style={{ maxWidth: '100%', height: 'auto' }}
          loadingText="読み込み中..."
        />
      );
    } else if (detailView === 'deities') {
      return (
        <>
          <div className="modal-subtitle">
            {t('enshrinedDeities')}
            <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
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
              <span className="text-muted">{t('noDeityInfo')}</span>
            )}
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
            itemsByPeriod={convertUserRankingsByPeriod(userRankingsByPeriod)}
            type="user"
            isLoading={false}
            onItemClick={onShowUser}
            maxItems={100}
          />
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
          <ManagedImage
            src={(data.image_url || data.image_url_m || data.image_url_s || NOIMAGE_SHRINE_DISPLAY_URL) + '?t=' + imageState.thumbCache}
            alt="サムネイル"
            fallbackSrc={NOIMAGE_SHRINE_DISPLAY_URL}
            loadingText="読み込み中..."
          />
          <div className="pane__thumbnail-actions">
            <button className="pane__icon-btn" onClick={(e) => {
              e.stopPropagation();
              imageActions.setIsUploadModalOpen(true);
            }} title={t('imageUpload')}><FaCloudUploadAlt size={20} /></button>
                      {(data.image_url || data.image_url_m || data.image_url_s) && (data.image_url || data.image_url_m || data.image_url_s) !== NOIMAGE_SHRINE_DISPLAY_URL && (
            <button className="pane__icon-btn" onClick={(e) => {
              e.stopPropagation();
              handleVote();
            }} title={t('thumbnailVote')}><FaVoteYea size={20} /></button>
          )}
        </div>
        {data.image_by && (data.image_url || data.image_url_m || data.image_url_s) && (data.image_url || data.image_url_m || data.image_url_s) !== NOIMAGE_SHRINE_DISPLAY_URL && (
          <div className="pane__thumbnail-by">{t('by')} {data.image_by}</div>
        )}
        </div>
        <div className="pane__info">
          <div className="pane__title">{data.name}</div>
          {data.kana && <div className="pane__kana">{data.kana}</div>}
          <div className="field-row">
            <span className="field-row__label">{t('count')}:</span>
            <span className="field-row__value">{data.count}</span>
          </div>
        </div>
      </div>
      
      <div className="small modal-item-text mb-4">{data.location}</div>
      
      {data.founded && (
        <div className="modal-section">
          <div className="field-row">
            <span className="field-row__label">{t('founded')}:</span>
            <span className="field-row__value">{data.founded}</span>
          </div>
        </div>
      )}
      
      {data.description && (
        <div className="modal-section">
          <div className="field-row">
            <span className="field-row__label">{t('description')}:</span>
            <span className="field-row__value field-row__value--multiline">{data.description}</span>
          </div>
        </div>
      )}

      {/* 参拝・遥拝ボタン */}
      <div className="modal-section">
        <div className="d-flex flex-column gap-2">
          <CustomButton
            className="btn-pray"
            onClick={() => prayMutation.mutate(id)}
            disabled={!canPray || markerStatus?.has_prayed_today || prayMutation.isPending}
            style={{ width: '100%' }}
          >
            {markerStatus?.has_prayed_today ? t('prayedToday') : t('pray')}
          </CustomButton>
          <CustomButton
            className="btn-remote-pray"
            onClick={() => remotePrayMutation.mutate()}
            disabled={!markerStatus?.can_remote_pray || remotePrayMutation.isPending}
            style={{ width: '100%' }}
          >
            {markerStatus?.max_worship_count !== undefined && markerStatus?.today_worship_count !== undefined
              ? `${t('remotePray')}（${t('remainingToday')}${markerStatus.max_worship_count - markerStatus.today_worship_count}）`
              : t('remotePray')
            }
          </CustomButton>
        </div>
        {distance !== null && (
          <div className="text-muted small mt-2">
            {t('distance')}: {formatDistance(distance)}
            {canPray ? ` (${t('prayable')})` : ` (${t('outOfRange')})`}
          </div>
        )}
      </div>
      
      <div className="modal-section">
        <div className="modal-subtitle" onClick={() => setDetailView('deities')} style={{ cursor: 'pointer' }}>
          {t('enshrinedDeities')}
          <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
        </div>
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
            <span className="text-muted">{t('noDeityInfo')}</span>
          )}
        </div>
      </div>
      
      {data.history && (
        <div className="modal-section">
          <div className="modal-subtitle">{t('history')}</div>
          <div className="small">{data.history}</div>
        </div>
      )}
      
      {data.festivals && (
        <div className="modal-section">
          <div className="modal-subtitle">{t('festivals')}</div>
          <div className="small">{data.festivals}</div>
        </div>
      )}

      {/* ランキング表示 */}
      <div className="modal-section">
        <div className="modal-subtitle" onClick={() => setDetailView('ranking')} style={{ cursor: 'pointer' }}>
          {t('prayRanking')}
          <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
        </div>
        <RankingPane
          itemsByPeriod={convertUserRankingsByPeriod(userRankingsByPeriod)}
          type="user"
          isLoading={false}
          onItemClick={onShowUser}
          maxItems={3}
        />
      </div>

      {/* アップロードモーダル */}
      <ImageUploadModal
        isOpen={imageState.isUploadModalOpen}
        onClose={() => imageActions.setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        title={`${data?.name || '神社'}の画像をアップロード`}
      />

      {/* サムネイル投票候補 */}
      <div className="modal-section">
        <div className="modal-subtitle">{t('thumbnailVoteCandidates')}</div>
        {imageListLoading ? (
          <div>{t('loadingImages')}</div>
        ) : imageListError ? (
          <div className="text-danger">{imageListError}</div>
        ) : imageList.length === 0 ? (
          <div>{t('noVoteCandidates')}</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {imageList.map(img => (
              <div key={img.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 8, width: 120, textAlign: 'center', position: 'relative' }}>
                <img src={img.thumbnail_url || img.image_url} alt="候補画像" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ fontSize: 12, margin: '4px 0' }}>{t('by')} {img.user?.name || t('unknown')}</div>
                <CustomButton
                  color="#28a745"
                  hoverColor="#218838"
                  disabledColor="#b1dfbb"
                  onClick={() => handleImageVote(img.id)}
                  style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                >
                  <FaVoteYea /> {t('vote')}
                </CustomButton>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{t('voteCount')}: {img.votes?.length || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 図鑑収録日と最終参拝日（一番下に表示） */}
      <div className="modal-section">
        <div className="field-row">
          <span className="field-row__label">{t('catalogedAt')}:</span>
          <span className="field-row__value">{data.catalogedAt ? formatDisplayDate(data.catalogedAt) : t('notRegistered')}</span>
        </div>
        <div className="field-row">
          <span className="field-row__label">{t('lastPrayedAt')}:</span>
          <span className="field-row__value">{data.lastPrayedAt ? formatDisplayDate(data.lastPrayedAt) : t('notRegistered')}</span>
        </div>
      </div>
    </div>
  );
});

export default ShrinePane;