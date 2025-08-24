import { useMutation, useQueryClient } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCompressAlt, FaExpandAlt, FaVoteYea } from 'react-icons/fa';
import { formatDistance } from '../../../backend/shared/utils/distance';
import { apiCall, apiCallWithToast } from '../../config/api';
import { NOIMAGE_SHRINE_DISPLAY_URL } from '../../constants';
import { useModal } from '../../contexts/ModalContext';
import { useAllShrines } from '../../hooks/useAllShrines';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import useDebugLog from '../../hooks/useDebugLog';
import { useImageManagement } from '../../hooks/useImageManagement';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { getDistanceMeters, usePrayDistance, useWorshipLimit } from '../../hooks/usePrayDistance';
import { useShrineDetail } from '../../hooks/useShrineDetail';
import { useShrineMarkerStatus } from '../../hooks/useShrineMarkerStatus';
import { useSubscription } from '../../hooks/useSubscription';
import { usePostShrineTravelLog, useShrineTravelLogCanPost, useShrineTravelLogs } from '../../hooks/useTravelLogs';
import { formatDisplayDate } from '../../utils/dateFormat';
import { useToast } from '../atoms';
import { CustomButton } from '../atoms/CustomButton';
import CustomLink from '../atoms/CustomLink';
import SizedThumbnailImage from '../atoms/SizedThumbnailImage';
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
            apiCall(`/shrines/${shrineId}/rankings-bundle`)
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
  getTitle: () => string;
}

const ShrinePane = forwardRef<ShrinePaneRef, { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void; onClose?: () => void; onDetailViewChange?: (detailView: DetailViewType) => void; onDataLoaded?: (name: string) => void }>(
  ({ id, onShowDiety, onShowUser, onClose, onDetailViewChange, onDataLoaded }, ref) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: detailData, refetch } = useShrineDetail(id);
  const { data: allShrines } = useAllShrines();

  // useAllShrinesから該当する神社のデータを取得（地図マーカーと同じデータソース）
  const data = useMemo(() => {
    if (!allShrines || !id) return detailData;
    return allShrines.find(shrine => shrine.id === id) || detailData;
  }, [allShrines, id, detailData]);
  const [rankRefreshKey, setRankRefreshKey] = useState(0);
  const { data: userRankingsByPeriod, isLoading: isRankingLoading } = useShrineUserRankingsBundle(id, rankRefreshKey);
  const queryClient = useQueryClient();
  const [userId] = useLocalStorageState<number | null>('userId', null);
  const { data: subscription } = useSubscription(userId);
  const debugLog = useDebugLog();
  const position = useCurrentPosition();
  const [debugMode] = useLocalStorageState('debugMode', false);
  const [debugCenter, setDebugCenter] = useState<[number, number] | null>(null);
  const [detailView, setDetailView] = useState<DetailViewType>('overview');
  const { updateCurrentModalName } = useModal();

  // 参拝成功時のローカル状態管理
  const [localPrayedToday, setLocalPrayedToday] = useState(false);
  const [localRemotePrayedToday, setLocalRemotePrayedToday] = useState(false);

  // detailViewが変更されたときに親コンポーネントに通知
  useEffect(() => {
    onDetailViewChange?.(detailView);
  }, [detailView, onDetailViewChange]);
  const { data: worshipLimit } = useWorshipLimit(userId);
  const { data: markerStatus, refetch: refetchMarkerStatus } = useShrineMarkerStatus(id, userId);
  const [imageList, setImageList] = useState<any[]>([]);
  const [imageListLoading, setImageListLoading] = useState(false);
  const [imageListError, setImageListError] = useState<string | null>(null);
  const [imageCache, setImageCache] = useState(Date.now());

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
    queryKeys: ['shrine', String(id)],
    relatedQueryKeys: [
      ['shrine', String(id)],
      ['shrine-image', String(id)],
      ['shrine-marker-status'],
      ['shrine-marker-status', String(id), String(userId || 0)]
    ]
  });

  // データ取得後にgetTitleメソッドを更新
  useEffect(() => {
    if (data?.name) {
      // データが取得されたら、親コンポーネントに通知してナビゲーション履歴を更新
      const title = data.kana ? `${data.name}(${data.kana})` : data.name;
      updateCurrentModalName(title);
    }
  }, [data?.name, data?.kana, updateCurrentModalName]);

  // marker-statusが更新された時にローカル状態をリセット
  useEffect(() => {
    if (markerStatus?.has_prayed_today) {
      setLocalPrayedToday(false);
    }
    if (markerStatus?.can_remote_pray === false) {
      setLocalRemotePrayedToday(false);
    }
  }, [markerStatus?.has_prayed_today, markerStatus?.can_remote_pray]);

  // refで外部から呼び出せるメソッドを定義
  useImperativeHandle(ref, () => ({
    backToOverview: () => setDetailView('overview'),
    getTitle: () => {
      if (!data?.name) return '';
      return data.kana ? `${data.name}(${data.kana})` : data.name;
    }
  }));

  // アップロード後のデータ再取得
  useEffect(() => {
    if (imageState.thumbCache > 0 && refetch) {
      refetch().then(() => {
        // データ更新後にimageCacheを更新
        setImageCache(Date.now());
      }).catch((error) => {
        console.error('ShrinePane: Data refetch failed:', error);
      });
    }
  }, [imageState.thumbCache, refetch]);

  // 画像URLが変更された時にimageCacheを更新
  useEffect(() => {
    if (data?.image_url_s || data?.image_url_m || data?.image_url_l || data?.image_url) {
      setImageCache(Date.now());
    }
  }, [data?.image_url_s, data?.image_url_m, data?.image_url_l, data?.image_url]);



  // 画像リスト取得
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setImageListLoading(true);

    // 前月のYYYYMMを計算
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyymm = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

            apiCall(`/api/shrines/${id}/images?votingMonth=${yyyymm}`)
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

    // 画像アップロード後に強制的にデータを再取得
    if (refetch) {
      await refetch();
    }

    // マーカーステータスも再取得
    if (refetchMarkerStatus) {
      await refetchMarkerStatus();
    }
  };

  const handleVote = async () => {
    await imageActions.handleVote();
    setRankRefreshKey(prev => prev + 1);
  };

  // 参拝距離を取得（usePrayDistanceフックを使用）
  const { prayDistance: apiPrayDistance } = usePrayDistance(userId);
  const prayDistance = apiPrayDistance ?? 100; // デフォルト値

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
      const result = await apiCallWithToast(`/shrines/${id}/pray`, {
        method: 'POST',
        body,
      }, showToast);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // ローカル状態を即座に更新して「本日参拝済み」に変更
        setLocalPrayedToday(true);
        queryClient.invalidateQueries({ queryKey: ['shrine', id] });
        queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
        queryClient.invalidateQueries({ queryKey: ['missions'] }); // ミッション進捗も更新
        queryClient.refetchQueries({ queryKey: ['missions'] }); // 即座に再取得
        queryClient.invalidateQueries({ queryKey: ['shrines-visited'] }); // 図鑑の神社一覧を更新
        queryClient.invalidateQueries({ queryKey: ['dieties-visited'] }); // 図鑑の神様一覧を更新
        setRankRefreshKey(k => k + 1); // ランキングも再取得
      }
    },
    onError: () => {
      // エラー時はローカル状態をリセット
      setLocalPrayedToday(false);
    },
  });

  const remotePrayMutation = useMutation({
    mutationFn: async () => {
      let body = undefined;
      if (currentPosition) {
        body = JSON.stringify({ lat: currentPosition[0], lng: currentPosition[1] });
      }
      const result = await apiCallWithToast(`/shrines/${id}/remote-pray`, {
        method: 'POST',
        body,
      }, showToast);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // ローカル状態を即座に更新
        setLocalRemotePrayedToday(true);
        queryClient.invalidateQueries({ queryKey: ['shrine', id] });
        queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
        queryClient.invalidateQueries({ queryKey: ['missions'] }); // ミッション進捗も更新
        queryClient.refetchQueries({ queryKey: ['missions'] }); // 即座に再取得
        queryClient.invalidateQueries({ queryKey: ['shrines-visited'] }); // 図鑑の神社一覧を更新
        queryClient.invalidateQueries({ queryKey: ['dieties-visited'] }); // 図鑑の神様一覧を更新
        setRankRefreshKey(k => k + 1); // ランキングも再取得
      }
    },
    onError: () => {
      // エラー時はローカル状態をリセット
      setLocalRemotePrayedToday(false);
    },
  });


  if (!data) {
    return <div className="p-3">{t('loading')}</div>;
  }

  // 画像ごとの投票
  const handleImageVote = async (imageId: number) => {
          const result = await apiCallWithToast(`/api/shrines/${id}/images/${imageId}/vote`, {
      method: 'POST',
    }, showToast);

    if (result.success) {
      setRankRefreshKey(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['shrine', id] });
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
        <SizedThumbnailImage
          size="m"
          alt="サムネイル"
          noImageUrl={NOIMAGE_SHRINE_DISPLAY_URL}
          expanded={true}
          images={{
            m: data.image_url_m
          }}
          loadingText="読み込み中..."
          shouldUseFallback={imageState.shouldUseFallback}
          cacheKey={imageState.thumbCache}
        />
      );
    } else if (detailView === 'deities') {
      return (
        <>
          <div className="modal-subtitle">
            {t('enshrinedDeities')}
            <FaCompressAlt size={16} className="margin-left-8 opacity-7" />
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
            <FaCompressAlt size={16} className="margin-left-8 opacity-7" />
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
            <FaCompressAlt size={16} className="margin-left-8 opacity-7" />
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
      }} className="cursor-pointer">
        {renderDetailContent()}
      </div>
    );
  }

  return (
    <Container fluid>
      {/* ヘッダー部分：サムネイルと情報を横並び */}
      <Row className="mb-3">
        <Col xs={12} md={6}>
          <SizedThumbnailImage
              key={`shrine-${id}-${imageCache}`}
              alt="サムネイル"
              noImageUrl={NOIMAGE_SHRINE_DISPLAY_URL}
              responsive={true}
              responsiveConfig={{
                breakpoints: [
                  { minWidth: 768, size: 'm' },   // タブレット以上: Mサイズ
                  { maxWidth: 767, size: 's' }    // スマホ以下: Sサイズ
                ],
                defaultSize: 's'
              }}
              images={{
                s: data.image_url_s,
                m: data.image_url_m
              }}
              loadingText="読み込み中..."
              shouldUseFallback={imageState.shouldUseFallback}
              cacheKey={imageCache}
              upload={{
                onUploadClick: () => imageActions.setIsUploadModalOpen(true),
                showUploadButton: true
              }}
              userInfo={{
                imageBy: data.image_by,
                imageByUserId: (data as any).image_by_user_id,
                onShowUser: onShowUser
              }}
              actions={{
                onClick: () => setDetailView('thumbnail'),
                thumbnailActions: imageState.currentImageUrl !== NOIMAGE_SHRINE_DISPLAY_URL ? (
                  <button className="pane__icon-btn" onClick={(e) => {
                    e.stopPropagation();
                    handleVote();
                  }} title={t('thumbnailVote')}><FaVoteYea size={20} /></button>
                ) : undefined
              }}
            />

        </Col>
        <Col xs={12} md={6}>
          <div className="pane__info">
            <div className="pane__title">{data.name}</div>
            {data.kana && <div className="pane__kana">{data.kana}</div>}
            <div className="field-row">
              <span className="field-row__label">{t('count')}:</span>
              <span className="field-row__value">{data.count}</span>
            </div>
          </div>
          <div className="small modal-item-text">{data.location}</div>
        </Col>
      </Row>

      {/* 基本情報 */}
      {(data.founded || data.description) && (
        <Row className="mb-3">
          <Col xs={12}>
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
          </Col>
        </Row>
      )}

      {/* 参拝・遥拝ボタン */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="modal-section">
            <Row className="g-2">
              <Col xs={12} md={6}>
                <CustomButton
                  className="btn-pray w-100"
                  onClick={() => prayMutation.mutate(id)}
                  disabled={!canPray || markerStatus?.has_prayed_today || localPrayedToday || prayMutation.isPending}
                  style={{ width: '100%' }}
                >
                  {(markerStatus?.has_prayed_today || localPrayedToday) ? t('prayedToday') : t('pray')}
                </CustomButton>
              </Col>
              <Col xs={12} md={6}>
                <CustomButton
                  className="btn-remote-pray w-100"
                  onClick={() => remotePrayMutation.mutate()}
                  disabled={!markerStatus?.can_remote_pray || localRemotePrayedToday || remotePrayMutation.isPending}
                  style={{ width: '100%' }}
                >
                  {markerStatus?.max_worship_count !== undefined && markerStatus?.today_worship_count !== undefined
                    ? `${t('remotePray')}（${t('remainingToday')}${markerStatus.max_worship_count - markerStatus.today_worship_count}）`
                    : t('remotePray')
                  }
                </CustomButton>
              </Col>
            </Row>
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
        </Col>
      </Row>

      {/* 祭神 */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="modal-section">
            <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('deities')}>
              {t('enshrinedDeities')}
              <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
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
        </Col>
      </Row>

      {/* 歴史・祭事 */}
      {(data.history || data.festivals) && (
        <Row className="mb-3">
          <Col xs={12}>
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
          </Col>
        </Row>
      )}

      {/* ランキング表示 */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="modal-section">
            <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('ranking')}>
              {t('prayRanking')}
              <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
            </div>
            <RankingPane
              itemsByPeriod={convertUserRankingsByPeriod(userRankingsByPeriod)}
              type="user"
              rankingType="shrine"
              isLoading={isRankingLoading}
              onItemClick={onShowUser}
              maxItems={3}
            />
          </div>
        </Col>
      </Row>

      {/* 旅の記録表示 */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="modal-section">
            <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('travelLogs')}>
              {t('travelLogs')}
              <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
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
        </Col>
      </Row>

      {/* サムネイル投票候補 */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="modal-section">
            <div className="modal-subtitle">{t('thumbnailVoteCandidates')}</div>
            {imageListLoading ? (
              <div>{t('loadingImages')}</div>
            ) : imageListError ? (
              <div className="text-danger">{imageListError}</div>
            ) : imageList.length === 0 ? (
              <div>{t('noVoteCandidates')}</div>
            ) : (
              <Row className="g-2">
                {imageList.map(img => (
                  <Col xs={6} sm={4} md={3} key={img.id}>
                    <div className="border-1 border-radius-8 padding-8 text-center position-relative">
                      <img src={img.thumbnail_url || img.image_url} alt="候補画像" className="object-fit-cover border-radius-4" style={{ width: '100%', height: 100 }} />
                      <div className="font-size-75" style={{ margin: '4px 0' }}>{t('by')} {img.user?.name || t('unknown')}</div>
                      <CustomButton
                        color="#28a745"
                        hoverColor="#218838"
                        disabledColor="#b1dfbb"
                        onClick={() => handleImageVote(img.id)}
                        style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                      >
                        <FaVoteYea /> {t('vote')}
                      </CustomButton>
                      <div className="font-size-75 text-muted" style={{ marginTop: 2 }}>{t('voteCount')}: {img.votes?.length || 0}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Col>
      </Row>

      {/* 図鑑収録日と最終参拝日 */}
      <Row>
        <Col xs={12}>
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
        </Col>
      </Row>

      {/* モーダル */}
      <ImageUploadModal
        isOpen={imageState.isUploadModalOpen}
        onClose={() => imageActions.setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        title={`${data?.name || '神社'}の画像をアップロード`}
      />

      <TravelLogModal
        isOpen={isTravelLogModalOpen}
        onClose={() => setIsTravelLogModalOpen(false)}
        onSubmit={handlePostTravelLog}
        title={`${data?.name || '神社'}の旅の記録を投稿`}
        isLoading={postTravelLog.isPending}
      />
    </Container>
  );
});

export default ShrinePane;
