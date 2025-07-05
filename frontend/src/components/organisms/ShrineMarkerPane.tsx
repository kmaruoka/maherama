import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import CustomLink from '../atoms/CustomLink';
import { useSubscription } from '../../hooks/useSubscription';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useDebugLog from '../../hooks/useDebugLog';
import './ShrineMarkerPane.css';

export interface Shrine {
  id: number;
  name: string;
  kana?: string;
  location: string;
  lat: number;
  lng: number;
  count: number;
  thumbnailUrl?: string;
  thumbnailBy?: string;
  founded?: string;
  history?: string;
  festivals?: string;
  description?: string;
  dieties: Array<{ id: number; name: string; kana?: string }>;
}

export default function ShrineMarkerPane({ shrine, refetchLogs, onShowDetail, currentPosition, addClientLog }: { shrine: Shrine; refetchLogs: () => void; onShowDetail?: (id: number) => void; currentPosition?: [number, number] | null; addClientLog?: (log: { message: string; time: string; type?: string }) => void; }) {
  const queryClient = useQueryClient();
  const [userId] = useLocalStorageState<number | null>('userId', null);
  const { data: subscription } = useSubscription(userId);
  const debugLog = useDebugLog();

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
  const radius = getRadiusFromSlots(subscription?.slots ?? 0);
  const canPray = currentPosition && getDistanceMeters(currentPosition[0], currentPosition[1], shrine.lat, shrine.lng) <= radius;

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
        if (addClientLog) {
          addClientLog({
            message: `参拝失敗: ${error.error || '不明なエラー'}`,
            time: new Date().toISOString(),
            type: 'error',
          });
        }
        throw new Error(error.error || '参拝に失敗しました');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines-all'] });
      refetchLogs();
    },
  });

  const remotePrayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/shrines/${shrine.id}/remote-pray`, {
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
      refetchLogs();
    },
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div className="modal-header">
          <CustomLink type="shrine" onClick={() => onShowDetail && onShowDetail(shrine.id)} className="modal-title">
            {shrine.name}
          </CustomLink>
        </div>
      </div>
      <div className="modal-info">
        <div className="catalog-count modal-item-text">参拝数: <span className="fw-bold">{shrine.count}</span></div>
      </div>

      {shrine.thumbnailUrl && (
        <div className="mb-4">
          <img
            src={shrine.thumbnailUrl}
            alt={shrine.name}
            className="w-100" style={{ height: '8rem', objectFit: 'cover', borderRadius: '.25rem' }}
          />
          {shrine.thumbnailBy && (
            <p className="text-muted small mt-1">by {shrine.thumbnailBy}</p>
          )}
        </div>
      )}

      <div className="mb-4">
        {shrine.founded && <p className="small text-muted mb-2">創建: {shrine.founded}</p>}
      </div>

      {shrine.history && (
        <div className="mb-4">
          <h4 className="fw-semibold mb-2">歴史・伝承</h4>
          <p className="small text-body-secondary">{shrine.history}</p>
        </div>
      )}

      {shrine.festivals && (
        <div className="mb-4">
          <h4 className="fw-semibold mb-2">祭礼</h4>
          <p className="small text-body-secondary">{shrine.festivals}</p>
        </div>
      )}

      {shrine.description && (
        <div className="mb-4">
          <h4 className="fw-semibold mb-2">説明</h4>
          <p className="small text-body-secondary">{shrine.description}</p>
        </div>
      )}

      <div className="d-flex gap-2 mt-2">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => prayMutation.mutate(shrine.id)}
          disabled={!canPray}
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
        {remotePrayMutation.error && (
          <p className="text-danger small mt-2">{remotePrayMutation.error.message}</p>
        )}
      </div>
    </div>
  );
} 