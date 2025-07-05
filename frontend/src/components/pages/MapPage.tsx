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
  return L.icon({
    iconUrl: thumbnailUrl || '/images/marker-icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

export default function MapPage({ onShowShrine, onShowUser, onShowDiety }: { onShowShrine: (id: number) => void; onShowUser?: (id: number) => void; onShowDiety?: (id: number) => void }) {
  const position = useCurrentPosition();
  const [debugMode] = useLocalStorageState('debugMode', false);
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: [number, number] = [35.68, 139.76];
  const defaultZoom = 17;
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [zoom] = useState<number>(defaultZoom);

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
    if (!mapRef.current) return;
    if (debugMode) {
      mapRef.current.dragging.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.doubleClickZoom.enable();
    } else {
      mapRef.current.dragging.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.doubleClickZoom.disable();
    }
  }, [debugMode]);

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
        whenReady={({ target }: any) => {
          mapRef.current = target;
        }}
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
