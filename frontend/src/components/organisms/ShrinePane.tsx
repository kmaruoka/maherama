import useShrineDetail from '../../hooks/useShrineDetail';
import CustomLink from '../atoms/CustomLink';
import RankingPane from './RankingPane';
import type { Period, RankingItem } from './RankingPane';
import { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useDebugLog from '../../hooks/useDebugLog';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import { useSubscription } from '../../hooks/useSubscription';
import { NOIMAGE_SHRINE_URL } from '../../constants';

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

export default function ShrinePane({ id, onShowDiety, onShowUser }: { id: number; onShowDiety?: (id: number) => void; onShowUser?: (id: number) => void }) {
  const { data } = useShrineDetail(id);
  const { data: userRankingsByPeriod, isLoading: isRankingLoading } = useShrineUserRankingsBundle(id);
  const queryClient = useQueryClient();
  const [userId] = useLocalStorageState<number | null>('userId', null);
  const { data: subscription } = useSubscription(userId);
  const debugLog = useDebugLog();
  const position = useCurrentPosition();
  const [debugMode] = useLocalStorageState('debugMode', false);
  const [debugCenter, setDebugCenter] = useState<[number, number] | null>(null);
  const [prayDistance, setPrayDistance] = useState<number | null>(null);

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
  function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000; // 地球半径(m)
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function getRadiusFromSlots(slots: number) {
    if (slots === 0) return 100;
    return 100 * Math.pow(2, slots);
  }

  // 参拝可能かどうかを判定
  const radius = prayDistance !== null ? prayDistance : getRadiusFromSlots(0);
  const distance = (currentPosition && data) ? Number(getDistanceMeters(Number(currentPosition[0]), Number(currentPosition[1]), Number(data.lat), Number(data.lng))) : null;
  // 小数点誤差を吸収して比較
  const canPray = typeof distance === 'number' && typeof radius === 'number' && !isNaN(distance) && !isNaN(radius) && (Math.floor(distance * 100) / 100) <= (Math.floor(radius * 100) / 100);

  // デバッグ情報を出力
  useEffect(() => {
    if (currentPosition && data) {
      const d = Number(getDistanceMeters(Number(currentPosition[0]), Number(currentPosition[1]), Number(data.lat), Number(data.lng)));
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
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
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
    },
  });

  const remotePrayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${id}/remote-pray`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '遥拝に失敗しました');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      queryClient.invalidateQueries({ queryKey: ['shrine-detail', id] });
    },
  });

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
          src={data.thumbnailUrl ? data.thumbnailUrl : NOIMAGE_SHRINE_URL}
          alt="サムネイル"
          className="rounded shadow"
          style={{ width: '6rem', height: '6rem', objectFit: 'contain' }}
        />
        <div>
          <div className="modal-title">{data.name}</div>
          {data.kana && <div className="modal-kana">{data.kana}</div>}
          <div className="d-flex align-items-center gap-2 mt-2">
            <div className="catalog-count modal-item-text small">参拝数: {data.count}</div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => prayMutation.mutate(data.id)}
              disabled={!canPray}
              title={!currentPosition ? '位置情報が取得できません' : !data ? '神社情報が読み込まれていません' : `距離: ${distance !== null ? distance.toFixed(2) : '計算中'}m / 半径: ${radius}m`}
            >
              参拝
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={() => remotePrayMutation.mutate()}
              disabled={remotePrayMutation.isPending}
            >
              {remotePrayMutation.isPending ? '遥拝中...' : '遥拝'}
            </button>
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
    </>
  );
} 