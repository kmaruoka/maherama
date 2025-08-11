import { useMutation, useQueryClient } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt, FaCompressAlt, FaExpandAlt, FaVoteYea } from 'react-icons/fa';
import { formatDistance } from '../../../backend/shared/utils/distance';
import { API_BASE, apiCall, apiCallWithToast } from '../../config/api';
import { NOIMAGE_SHRINE_DISPLAY_URL } from '../../constants';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import useDebugLog from '../../hooks/useDebugLog';
import { useImageManagement } from '../../hooks/useImageManagement';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { getDistanceMeters, useWorshipLimit } from '../../hooks/usePrayDistance';
import { useShrineDetail } from '../../hooks/useShrineDetail';
import { useShrineMarkerStatus } from '../../hooks/useShrineMarkerStatus';
import { useSubscription } from '../../hooks/useSubscription';
import { usePostShrineTravelLog, useShrineTravelLogCanPost, useShrineTravelLogs } from '../../hooks/useTravelLogs';
import { formatDisplayDate } from '../../utils/dateFormat';
import { useToast } from '../atoms';
import { CustomButton } from '../atoms/CustomButton';
import CustomLink from '../atoms/CustomLink';
import { ManagedImage } from '../atoms/ManagedImage';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import { TravelLogModal } from '../molecules/TravelLogModal';
import { TravelLogsDisplay } from '../molecules/TravelLogsDisplay';
import type { Period, RankingItemData } from './RankingPane';
import RankingPane from './RankingPane';

function useShrineUserRankingsBundle(shrineId: number | undefined, refreshKey: number): { data: { [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }, isLoading: boolean } {
  const [data, setData] = useState<{ [key in Period]: { userId: number; userName: string; count: number; rank: number; }[] }>({ all: [], yearly: [], monthly: [], weekly: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shrineId) return;
    setLoading(true);
    apiCall(`${API_BASE}/shrines/${shrineId}/rankings-bundle`)
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

type DetailViewType = 'overview' | 'thumbnail' | 'deities' | 'ranking' | 'travelLogs';

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

  // 旅の記録関連
  const [travelLogsPage, setTravelLogsPage] = useState(1);
  const [isTravelLogsExpanded, setIsTravelLogsExpanded] = useState(false);
  const [isTravelLogModalOpen, setIsTravelLogModalOpen] = useState(false);
  const { data: travelLogsData, isLoading: isTravelLogsLoading } = useShrineTravelLogs(
    id,
    isTravelLogsExpanded ? travelLogsPage : 1,
    isTravelLogsExpanded ? 50 : 3
  );
  const { data: travelLogCanPost } = useShrineTravelLogCanPost(id);
  const postTravelLog = usePostShrineTravelLog();

  // 投稿成功時のToast表示
  useEffect(() => {
    if (postTravelLog.isSuccess) {
      showToast(t('travelLogPosted'), 'success');
    }
  }, [postTravelLog.isSuccess, showToast, t]);

  // 投稿失敗時のToast表示
  useEffect(() => {
    if (postTravelLog.isError) {
      showToast(t('travelLogPostError'), 'error');
    }
  }, [postTravelLog.isError, showToast, t]);

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

      // 画像URLの存在確認を行う
      const imageUrl = data.image_url_l || data.image_url_m || data.image_url || data.image_url_s;
      if (imageUrl && imageUrl !== NOIMAGE_SHRINE_DISPLAY_URL) {
        imageActions.handleImageUrlChange(imageUrl);
      }
    }
  }, [data?.image_url, data?.image_url_m, data?.image_url_s, data?.image_url_l]);

  // 画像リスト取得
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setImageListLoading(true);

    // 前月のYYYYMMを計算
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyymm = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    apiCall(`${API_BASE}/shrines/${id}/images?votingMonth=${yyyymm}`)
      .then(res => res.json())
      .then(json => {
        if (isMounted) {
          setImageList(json);
        }
      })
      .catch(e => {
        if (isMounted) {
          setImageListError(t('imageListError'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setImageListLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
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
    let isMounted = true;

    if (userId) {
      fetch(`${API_BASE}/users/${userId}/pray-distance`, {
        headers: { 'x-user-id': String(userId) }
      })
        .then(res => res.json())
        .then(data => {
          if (isMounted && typeof data.pray_distance === 'number') {
            setPrayDistance(data.pray_distance);
          }
        })
        .catch(error => {
          if (isMounted) {
            console.error('[ShrinePane] pray-distance取得エラー:', error);
          }
        });
    }

    return () => {
      isMounted = false;
    };
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
  // GPS位置が取得できない場合は、距離チェックをスキップして参拝を許可
  const canPray = currentPosition === null ? true : (
    distance !== null &&
    !isNaN(distance) &&
    !isNaN(radius) &&
    distance <= radius
  );

  // デバッグ情報を出力
  useEffect(() => {
    if (data) {
      const d = currentPosition ? getDistanceMeters(currentPosition[0], currentPosition[1], data.lat, data.lng) : null;
      debugLog(`神社: ${data.name} | 現在位置: ${currentPosition ? `[${currentPosition[0]}, ${currentPosition[1]}]` : 'null'} | 神社位置: [${data.lat}, ${data.lng}] | 距離: ${d !== null ? formatDistance(d) : 'null'} | 半径: ${formatDistance(radius)} | 参拝可能: ${canPray} | デバッグモード: ${debugMode} | GPS位置: ${position ? `[${position[0]}, ${position[1]}]` : 'null'}`);
    }
  }, [currentPosition, data, radius, canPray, debugMode, debugLog, position]);

  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      let body = undefined;
      if (currentPosition) {
        body = JSON.stringify({ lat: currentPosition[0], lng: currentPosition[1] });
      }
      const result = await apiCallWithToast(`${API_BASE}/shrines/${id}/pray`, {
        method: 'POST',
        body,
      }, showToast);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
        queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
        queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
        queryClient.invalidateQueries({ queryKey: ['missions'] }); // ミッション進捗も更新
        queryClient.refetchQueries({ queryKey: ['missions'] }); // 即座に再取得
        setRankRefreshKey(k => k + 1); // ランキングも再取得
      }
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
      const result = await apiCallWithToast(`${API_BASE}/shrines/${id}/remote-pray`, {
        method: 'POST',
      }, showToast);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
        queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
        queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
        queryClient.invalidateQueries({ queryKey: ['missions'] }); // ミッション進捗も更新
        queryClient.refetchQueries({ queryKey: ['missions'] }); // 即座に再取得
        setRankRefreshKey(k => k + 1); // ランキングも再取得
      }
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
    const result = await apiCallWithToast(`${API_BASE}/shrines/${id}/images/${imageId}/vote`, {
      method: 'POST',
    }, showToast);

    if (result.success) {
      setRankRefreshKey(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['shrine', id] });
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
    }
  };

  const handlePostTravelLog = async (content: string) => {
    await postTravelLog.mutateAsync({ shrineId: id, data: { content } });
  };

  const handleLoadMoreTravelLogs = () => {
    setTravelLogsPage(prev => prev + 1);
  };

  const handleToggleTravelLogsExpand = () => {
    setIsTravelLogsExpanded(!isTravelLogsExpanded);
    if (!isTravelLogsExpanded) {
      setTravelLogsPage(1);
    }
  };

  // 詳細表示のレンダリング関数
  const renderDetailContent = () => {
    if (detailView === 'thumbnail') {
              return (
          <ManagedImage
            src={(data.image_url_l || data.image_url_m || data.image_url_s || data.image_url || NOIMAGE_SHRINE_DISPLAY_URL) + (imageState.thumbCache > 0 ? '?t=' + imageState.thumbCache : '')}
            alt="サムネイル"
            fallbackSrc={NOIMAGE_SHRINE_DISPLAY_URL}
          style={{ maxWidth: '100%', height: 'auto' }}
          loadingText="読み込み中..."
          shouldUseFallback={imageState.shouldUseFallback}
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
            rankingType="shrine"
            isLoading={false}
            onItemClick={onShowUser}
            maxItems={100}
          />
        </>
      );
    } else if (detailView === 'travelLogs') {
      return (
        <>
          <div className="modal-subtitle">
            {t('travelLogs')}
            <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
          <TravelLogsDisplay
            logs={travelLogsData?.logs || []}
            pagination={travelLogsData?.pagination}
            isLoading={isTravelLogsLoading}
            isExpanded={true}
            onToggleExpand={handleToggleTravelLogsExpand}
            onLoadMore={handleLoadMoreTravelLogs}
            onShowUser={onShowUser}
            canPost={travelLogCanPost?.canPost ?? false}
            onPostClick={() => setIsTravelLogModalOpen(true)}
            maxPreviewItems={50}
            remainingPosts={travelLogCanPost?.remainingPosts}
            prayCount={travelLogCanPost?.prayCount}
            postedLogCount={travelLogCanPost?.postedLogCount}
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
            src={(data.image_url_m || data.image_url_s || data.image_url || NOIMAGE_SHRINE_DISPLAY_URL) + (imageState.thumbCache > 0 ? '?t=' + imageState.thumbCache : '')}
            alt="サムネイル"
            fallbackSrc={NOIMAGE_SHRINE_DISPLAY_URL}
            loadingText="読み込み中..."
            shouldUseFallback={imageState.shouldUseFallback}
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
        {currentPosition === null ? (
          <div className="text-muted small mt-2">
            {t('gpsNotAvailable')} - {t('prayWithoutDistanceCheck')}
          </div>
        ) : distance !== null && (
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
          rankingType="shrine"
          isLoading={false}
          onItemClick={onShowUser}
          maxItems={3}
        />
      </div>

      {/* 旅の記録表示 */}
      <div className="modal-section">
        <div className="modal-subtitle" onClick={() => setDetailView('travelLogs')} style={{ cursor: 'pointer' }}>
          {t('travelLogs')}
          <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
        </div>
        <TravelLogsDisplay
          logs={travelLogsData?.logs || []}
          pagination={travelLogsData?.pagination}
          isLoading={isTravelLogsLoading}
          isExpanded={false}
          onToggleExpand={handleToggleTravelLogsExpand}
          onLoadMore={handleLoadMoreTravelLogs}
          onShowUser={onShowUser}
          canPost={travelLogCanPost?.canPost ?? false}
          onPostClick={() => setIsTravelLogModalOpen(true)}
          maxPreviewItems={3}
          remainingPosts={travelLogCanPost?.remainingPosts}
          prayCount={travelLogCanPost?.prayCount}
          postedLogCount={travelLogCanPost?.postedLogCount}
        />
      </div>

      {/* アップロードモーダル */}
      <ImageUploadModal
        isOpen={imageState.isUploadModalOpen}
        onClose={() => imageActions.setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        title={`${data?.name || '神社'}の画像をアップロード`}
      />

      {/* 旅の記録投稿モーダル */}
      <TravelLogModal
        isOpen={isTravelLogModalOpen}
        onClose={() => setIsTravelLogModalOpen(false)}
        onSubmit={handlePostTravelLog}
        title={`${data?.name || '神社'}の旅の記録を投稿`}
        isLoading={postTravelLog.isPending}
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
