import { useEffect, useRef, useState } from 'react';
import useCurrentPosition from '../../hooks/useCurrentPosition';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import '../../setupLeaflet';
import { MAPBOX_API_KEY } from '../../config/api';
import useLogs from '../../hooks/useLogs';
import useAllShrines from '../../hooks/useAllShrines';
import ShrineMarkerPane from '../organisms/ShrineMarkerPane';
import LogPane from '../organisms/LogPane';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CustomCircle from '../atoms/CustomCircle';

function createShrineIcon(thumbnailUrl?: string) {
  // 大きな16:9サムネイル＋枠＋アニメーション光沢＋ピン（三角形）
  return L.divIcon({
    className: '',
    html: `
      <div class="shrine-marker-frame-anim">
        <div class="shrine-marker-thumbnail-wrap">
          <img src="${thumbnailUrl || '/images/noimage-shrine.png'}" alt="shrine" />
          <div class="shrine-marker-thumbnail-gloss"></div>
        </div>
        <div class="shrine-marker-pin"></div>
      </div>
    `,
    iconSize: [120, 95.5], // サムネイル+ピン
    iconAnchor: [60, 95.5], // 下端中央
    popupAnchor: [0, -95.5],
  });
}

const debugCurrentIcon = new L.Icon({
  iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function MapPage({ onShowShrine, onShowUser, onShowDiety }: { onShowShrine: (id: number) => void; onShowUser?: (id: number) => void; onShowDiety?: (id: number) => void }) {
  const position = useCurrentPosition();
  const [debugMode] = useLocalStorageState('debugMode', false);
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: [number, number] = [34.702485, 135.495951]; // 大阪・梅田
  const defaultZoom = 17;
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [zoom] = useState<number>(defaultZoom);
  const [mapReady, setMapReady] = useState(false);

  const {
    data: logs = [],
    refetch: refetchLogs,
    isLoading: logsLoading,
    error: logsError,
  } = useLogs();

  const { data: shrines = [] } = useAllShrines();

  // GPS追従（通常モード）
  useEffect(() => {
    if (!debugMode && position && mapRef.current) {
      mapRef.current.setView(position, defaultZoom);
    }
  }, [position, debugMode]);

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
      }
    };

    map.on('moveend', onMoveEnd);
    return () => { map.off('moveend', onMoveEnd); };
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

  return (
    <>
      <MapContainer
        center={debugMode ? center : (position || defaultCenter)}
        zoom={debugMode ? zoom : defaultZoom}
        minZoom={4}
        maxZoom={19}
        style={{ height: 'calc(100vh - 56px)' }}
        whenReady={((event: { target: L.Map }) => { mapRef.current = event.target; setMapReady(true); }) as unknown as () => void}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
          url={`https://api.mapbox.com/styles/v1/kmigosso/cmcjan1td000401ridva77z79/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_API_KEY}`}
          tileSize={512}
          zoomOffset={-1}
        />
        {debugMode && center && (
          <CustomCircle center={center} rank={"free"} />
        )}
        {!debugMode && position && (
          <CustomCircle center={position} rank={"free"} />
        )}
        {/* デバッグ用: 現在地ピン */}
        {position && (
          <Marker position={position} icon={debugCurrentIcon}>
            <Popup>現在地: {position[0]}, {position[1]}</Popup>
          </Marker>
        )}
        {/* 通常の神社マーカー */}
        {shrines.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={createShrineIcon(s.thumbnailUrl)}>
            <Popup>
              <ShrineMarkerPane shrine={s} refetchLogs={refetchLogs} onShowDetail={onShowShrine} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <LogPane logs={logs} loading={logsLoading} error={!!logsError} onShowShrine={onShowShrine} onShowUser={onShowUser} onShowDiety={onShowDiety} />
    </>
  );
}
