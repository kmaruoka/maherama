import useShrineDetail from '../../hooks/useShrineDetail';
import CustomLink from '../atoms/CustomLink';
import RankingPane from './RankingPane';
import type { Period, RankingItem } from './RankingPane';
import { useState, useEffect } from 'react';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import ImageVoteButton from '../atoms/ImageVoteButton';
import { API_BASE } from '../../config/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useDebugLog from '../../hooks/useDebugLog';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import { useSubscription } from '../../hooks/useSubscription';
import { NOIMAGE_SHRINE_URL } from '../../constants';
import { getDistanceMeters } from '../../hooks/usePrayDistance';
import { useWorshipLimit } from '../../hooks/usePrayDistance';
import { FaCloudUploadAlt, FaVoteYea } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { CustomButton } from '../atoms/CustomButton';

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

export default function ShrinePane({ id, onShowDiety, onShowUser }: { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
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
  const { data: worshipLimit } = useWorshipLimit(userId);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [imageList, setImageList] = useState<any[]>([]);
  const [imageListLoading, setImageListLoading] = useState(false);
  const [imageListError, setImageListError] = useState<string | null>(null);

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
      .catch(e => setImageListError('画像リスト取得失敗'))
      .finally(() => setImageListLoading(false));
  }, [id, rankRefreshKey]);

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${API_BASE}/shrines/${id}/images/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': String(userId || 1),
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('アップロード失敗');
      }
      
      // 成功時はデータ再取得
      setRankRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert('アップロードに失敗しました。');
    }
  };

  const handleVote = async () => {
    try {
      const response = await fetch(`${API_BASE}/shrines/${id}/images/vote`, {
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
      
      // 成功時はデータ再取得
      setRankRefreshKey(prev => prev + 1);
      alert('投票しました！');
    } catch (error) {
      console.error('投票エラー:', error);
      alert(error instanceof Error ? error.message : '投票に失敗しました。');
    }
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
  useEffect(() => {
    if (currentPosition && data) {
      const d = getDistanceMeters(currentPosition[0], currentPosition[1], data.lat, data.lng);
      debugLog(`[DEBUG] 神社: ${data.name} | 現在位置: [${currentPosition[0]}, ${currentPosition[1]}] | 神社位置: [${data.lat}, ${data.lng}] | 距離: ${d.toFixed(2)}m (typeof: ${typeof d}) | 半径: ${radius}m (typeof: ${typeof radius}) | 参拝可能: ${canPray} | デバッグモード: ${debugMode}`);
    }
  }, [currentPosition, data, radius, canPray, debugMode, debugLog]);

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
        throw new Error(error.error || '参拝に失敗しました');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
      setRankRefreshKey(k => k + 1); // ランキングも再取得
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
          throw new Error('サーバーエラーです。時間をおいて再度お試しください');
        } else {
          throw new Error(error.error || '遥拝に失敗しました');
        }
      }
      return error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', id, userId] });
      setRankRefreshKey(k => k + 1); // ランキングも再取得
    },
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (!data) {
    return <div className="p-3">Loading...</div>;
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
          <img src={data.thumbnailUrl ? data.thumbnailUrl : NOIMAGE_SHRINE_URL} alt="サムネイル" style={{ width: 256, height: 256, objectFit: 'cover', borderRadius: 8 }} />
          {/* 右上ボタン */}
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer' }} 
              title="画像アップロード"
            >
              <FaCloudUploadAlt size={20} />
            </button>
            <button 
              onClick={handleVote}
              style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer' }} 
              title="サムネイル投票"
            >
              <FaVoteYea size={20} />
            </button>
          </div>
          {/* 左下 byユーザー */}
          {data.thumbnailBy && (
            <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
              by {data.thumbnailBy}
            </div>
          )}
        </div>
        <div>
          <div className="modal-title">{data.name}</div>
          {data.kana && <div className="modal-kana">{data.kana}</div>}
          {data.thumbnailBy && (
            <div className="small text-muted">by {data.thumbnailBy}</div>
          )}
          <div className="d-flex align-items-center gap-2 mt-2">
            <div className="catalog-count modal-item-text small">参拝数: {data.count}</div>
            <CustomButton
              color="#28a745"
              hoverColor="#218838"
              disabledColor="#b1dfbb"
              onClick={() => prayMutation.mutate(data.id)}
              disabled={!canPray}
              style={{ fontSize: 16, padding: '4px 16px' }}
              title={!currentPosition ? '位置情報が取得できません' : !data ? '神社情報が読み込まれていません' : `距離: ${distance !== null ? distance.toFixed(2) : '計算中'}m / 半径: ${radius}m`}
            >
              参拝
            </CustomButton>
            <CustomButton
              color="#007bff"
              hoverColor="#0056b3"
              disabledColor="#b8daff"
              onClick={() => remotePrayMutation.mutate()}
              disabled={remotePrayMutation.isPending || (worshipLimit && worshipLimit.today_worship_count >= worshipLimit.max_worship_count)}
              style={{ fontSize: 16, padding: '4px 16px' }}
            >
              {remotePrayMutation.isPending ? '遥拝中...' : '遥拝'}
            </CustomButton>
          </div>
          {currentPosition && data && (
            <div className="text-muted small mt-1">
              距離: {distance !== null ? distance.toFixed(2) : '計算中'}m / 参拝可能距離: {radius}m
            </div>
          )}
          {canPray === false && currentPosition && data && (
            <div className="text-danger small mt-1">
              現在地が神社から離れすぎています
            </div>
          )}
          {prayMutation.error && (
            <p className="text-danger small mt-2">{prayMutation.error.message}</p>
          )}
          {remotePrayMutation.error && (
            <p className="text-danger small mt-2">{remotePrayMutation.error.message}</p>
          )}
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

      {/* アップロードモーダル */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        title={`${data?.name || '神社'}の画像をアップロード`}
      />

      {/* サムネイル投票候補 */}
      <div className="modal-section">
        <div className="modal-subtitle">サムネイル投票候補</div>
        {imageListLoading ? (
          <div>画像読み込み中...</div>
        ) : imageListError ? (
          <div className="text-danger">{imageListError}</div>
        ) : imageList.length === 0 ? (
          <div>投票候補画像がありません</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {imageList.map(img => (
              <div key={img.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 8, width: 120, textAlign: 'center', position: 'relative' }}>
                <img src={img.thumbnail_url || img.image_url} alt="候補画像" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ fontSize: 12, margin: '4px 0' }}>by {img.user?.name || '不明'}</div>
                <CustomButton
                  color="#28a745"
                  hoverColor="#218838"
                  disabledColor="#b1dfbb"
                  onClick={() => handleImageVote(img.id)}
                  style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                >
                  <FaVoteYea /> 投票
                </CustomButton>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>投票数: {img.votes?.length || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}