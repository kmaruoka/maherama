import { useEffect, useRef, useState, useMemo } from 'react';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { MapContainer, TileLayer, Marker, Pane } from 'react-leaflet';
import '../../setupLeaflet';
import { MAPBOX_API_KEY, API_BASE } from '../../config/api';
import useLogs, { useClientLogs } from '../../hooks/useLogs';
import useAllShrines from '../../hooks/useAllShrines';
import LogPane from '../organisms/LogPane';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CustomCircle from '../atoms/CustomCircle';
import ShrineMarker from '../atoms/ShrineMarker';
import useDebugLog from '../../hooks/useDebugLog';
import { useSubscription } from '../../hooks/useSubscription';
import { useBarrier } from '../../barriers/BarrierContext';
import BarrierAnimationOverlay from '../molecules/BarrierAnimationOverlay';
import { useQueryClient } from '@tanstack/react-query';
import { calculateDistance, EARTH_CIRCUMFERENCE_METERS } from "../../../backend/shared/utils/distance";


const debugCurrentIcon = new L.Icon({
  iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function MapPage({ onShowShrine, onShowUser, onShowDiety }: { onShowShrine: (id: number) => void; onShowUser?: (id: number) => void; onShowDiety?: (id: number) => void }) {
  const position = useCurrentPosition();
  const [debugMode] = useLocalStorageState('debugMode', false);
  const { barrier, barrierName } = useBarrier();
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: [number, number] = [34.702485, 135.495951]; // 大阪・梅田
  const defaultZoom = 17;
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [zoom] = useState<number>(defaultZoom);
  const [mapReady, setMapReady] = useState(false);
  const queryClient = useQueryClient();

  const { clientLogs, addClientLog } = useClientLogs();
  const {
    data: logs = [],
    refetch: refetchLogs,
    isLoading: logsLoading,
    error: logsError,
  } = useLogs(clientLogs);

  const { data: shrines = [] } = useAllShrines();

  // 前回の座標を保持するref
  const prevPositionRef = useRef<[number, number] | null>(null);

  const debugLog = useDebugLog();

  const [userId] = useLocalStorageState<number | null>('userId', null);
  const { data: subscription } = useSubscription(userId);

  const [prayDistance, setPrayDistance] = useState<number>(100);
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

  // 参拝後にマーカー状態を更新する関数
  const handleShrineClick = (shrineId: number) => {
    // 参拝後にマーカー状態のクエリを無効化
    queryClient.invalidateQueries({ queryKey: ['shrine-marker-status', shrineId, userId] });
    onShowShrine(shrineId);
  };

  // GPS追従（通常モード）
  useEffect(() => {
    if (!debugMode && position && mapRef.current) {
      mapRef.current.setView(position, defaultZoom);
    }
  }, [position, debugMode]);

  // デバッグモード切り替え時の処理
  useEffect(() => {
    if (debugMode) {
      // デバッグモード開始時に現在の中心位置を保存
      localStorage.setItem('debugMapCenter', JSON.stringify(center));
    }
  }, [debugMode, center]);

  // 地図の操作可否切り替え
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (debugMode) {
      mapRef.current.dragging.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.doubleClickZoom.enable();
    } else {
      mapRef.current.dragging.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.doubleClickZoom.disable();
    }
  }, [debugMode, mapReady]);

  // moveend イベントハンドラ（debugMode時のみ）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !debugMode) return;

    const onMoveEnd = () => {
      const c = map.getCenter();
      const newCenter: [number, number] = [c.lat, c.lng];
      // 無限ループ防止（微差回避）
      if (Math.abs(center[0] - newCenter[0]) > 1e-7 || Math.abs(center[1] - newCenter[1]) > 1e-7) {
        //console.log('moveend: updating center', newCenter);
        setCenter(newCenter);
        // デバッグ中心位置をlocalStorageに保存
        localStorage.setItem('debugMapCenter', JSON.stringify(newCenter));
      }
    };

    const onMove = () => {
      const c = map.getCenter();
      const newCenter: [number, number] = [c.lat, c.lng];
      // 移動中もリアルタイムで更新
      setCenter(newCenter);
      localStorage.setItem('debugMapCenter', JSON.stringify(newCenter));
    };

    map.on('moveend', onMoveEnd);
    map.on('move', onMove);
    return () => { 
      map.off('moveend', onMoveEnd);
      map.off('move', onMove);
    };
  }, [debugMode, center]);

  // debugMode時、center変更でsetView（現在のmapとずれていれば）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !debugMode) return;
    const c = map.getCenter();
    if (Math.abs(c.lat - center[0]) > 1e-7 || Math.abs(c.lng - center[1]) > 1e-7) {
      map.setView(center);
    }
  }, [center, debugMode]);

  // 現在位置移動時にデバッグログ出力
  useEffect(() => {
    if (debugMode) {
      // centerの変化を現在位置移動とみなす
      const prev = prevPositionRef.current;
      if (!prev || prev[0] !== center[0] || prev[1] !== center[1]) {
        debugLog(`現在位置が移動: [${center[0]}, ${center[1]}]`);
        prevPositionRef.current = center;
      }
    } else if (position) {
      // 通常モードはposition
      const prev = prevPositionRef.current;
      if (!prev || prev[0] !== position[0] || prev[1] !== position[1]) {
        debugLog(`現在位置が移動: [${position[0]}, ${position[1]}]`);
        prevPositionRef.current = position;
      }
    }
  }, [center, position, debugMode, debugLog]);

  // center: 現在地 or デバッグ中心
  const centerArray = debugMode ? center : (position || defaultCenter);

  // 参拝半径3倍以内の神社だけ表示
  const filteredShrines = useMemo(() => {
    if (!centerArray || !prayDistance) return shrines;
    return shrines.filter(s =>
      calculateDistance({ lat: centerArray[0], lng: centerArray[1] }, { lat: s.lat, lng: s.lng }) <= prayDistance * 3
    );
  }, [shrines, centerArray, prayDistance]);

  const maxZoom = 18;
  const baseDistance = 100; // 100mを基準
  const baseZoom = useMemo(() => {
    const earthCircumference = EARTH_CIRCUMFERENCE_METERS;
    const prayCircleDiameter = baseDistance * 2;
    const screenWidthPx = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const targetPx = screenWidthPx / 4;
    const metersPerPixel = prayCircleDiameter / targetPx;
    const zoom = Math.log2(earthCircumference / (256 * metersPerPixel));
    return zoom;
  }, []);
  const MAPBOX_TILE_MIN_ZOOM = 10; // Mapboxタイルの最小ズーム
  const minZoom = useMemo(() => {
    if (!prayDistance) return MAPBOX_TILE_MIN_ZOOM;
    const earthCircumference = EARTH_CIRCUMFERENCE_METERS;
    const prayCircleDiameter = baseDistance * 2;
    const screenWidthPx = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const targetPx = screenWidthPx / 4;
    const metersPerPixel = prayCircleDiameter / targetPx;
    const zoom = baseZoom - Math.log2(prayDistance / baseDistance);
    let minZoom = Math.max(MAPBOX_TILE_MIN_ZOOM, Math.floor(zoom));
    if (maxZoom - minZoom < 1) minZoom = maxZoom - 1;
    minZoom = Math.min(maxZoom, minZoom + 1);
    return minZoom;
  }, [prayDistance, baseZoom]);
  const initialZoom = minZoom;

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // console.log('[DEBUG] zoom制御', {
    //   prayDistance,
    //   windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'N/A',
    //   baseZoom,
    //   minZoom,
    //   maxZoom,
    //   initialZoom,
    //   mapZoom: mapRef.current.getZoom(),
    //   mapMinZoom: mapRef.current.getMinZoom(),
    //   mapMaxZoom: mapRef.current.getMaxZoom(),
    // });
  }, [mapReady, minZoom, prayDistance, baseZoom, initialZoom, maxZoom]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMinZoom(minZoom);
      mapRef.current.setMaxZoom(maxZoom);
    }
  }, [minZoom, maxZoom, mapReady]);

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 56px)' }}>
      <MapContainer
        center={debugMode ? center : (position || defaultCenter)}
        zoom={minZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        style={{ height: '100%', position: 'relative' }}
        whenReady={((event: { target: L.Map }) => { mapRef.current = event.target; setMapReady(true); }) as unknown as () => void}
      >
        <TileLayer
          key={`tilelayer-${minZoom}-${maxZoom}`}
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
          url={`https://api.mapbox.com/styles/v1/kmigosso/cmcjan1td000401ridva77z79/tiles/512/{z}/{x}/{y}?access_token=${MAPBOX_API_KEY}`}
          tileSize={512}
          zoomOffset={-1}
          maxZoom={maxZoom}
          minZoom={minZoom}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />
        <Pane name="barrierPane" style={{ zIndex: 399 }}>
          {/* 半透明円は従来通り */}
          <CustomCircle center={centerArray} radius={prayDistance} />
        </Pane>
        {/* アニメーション */}
        <BarrierAnimationOverlay radius={prayDistance} barrierType={barrierName} />
        {/* デバッグ用: 現在地ピン */}
        {position && (
          <Marker position={position} icon={debugCurrentIcon}>
          </Marker>
        )}
        {/* 通常の神社マーカー（フィルタ済みのみ） */}
        {filteredShrines.map((s) => {
          const currentPosition = debugMode ? center : position;
          return (
            <ShrineMarker
              key={s.id}
              shrine={s}
              currentPosition={currentPosition}
              onShowShrine={handleShrineClick}
            />
          );
        })}
      </MapContainer>
      <LogPane logs={logs} loading={logsLoading} error={!!logsError} onShowShrine={onShowShrine} onShowUser={onShowUser} onShowDiety={onShowDiety} />
    </div>
  );
}
