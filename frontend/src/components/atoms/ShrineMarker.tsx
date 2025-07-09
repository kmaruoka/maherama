import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { NOIMAGE_SHRINE_URL } from '../../constants';
import { getDistanceMeters } from '../../hooks/usePrayDistance';
import useDebugLog from '../../hooks/useDebugLog';

interface Shrine {
  id: number;
  name: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string;
}

interface ShrineMarkerProps {
  shrine: Shrine;
  currentPosition: [number, number] | null;
  onShowShrine: (id: number) => void;
}

function createShrineIcon(thumbnailUrl?: string) {
  // 大きな16:9サムネイル＋枠＋アニメーション光沢＋ピン（三角形）
  return L.divIcon({
    className: '',
    html: `
      <div class="shrine-marker-frame-anim">
        <div class="shrine-marker-thumbnail-wrap">
          <img src="${thumbnailUrl || NOIMAGE_SHRINE_URL}" alt="shrine" />
          <div class="shrine-marker-thumbnail-gloss"></div>
        </div>
        <div class="shrine-marker-pin"></div>
      </div>
    `,
    iconSize: [120, 95.5], // サムネイル+ピン
    iconAnchor: [60, 85.5], // 下端中央
    popupAnchor: [0, -95.5],
  });
}

export default function ShrineMarker({ shrine, currentPosition, onShowShrine }: ShrineMarkerProps) {
  const debugLog = useDebugLog();

  return (
    <Marker
      position={[shrine.lat, shrine.lng]}
      icon={createShrineIcon(shrine.thumbnailUrl)}
      eventHandlers={{
        click: () => {
          if (currentPosition) {
            const dist = getDistanceMeters(currentPosition[0], currentPosition[1], shrine.lat, shrine.lng);
            debugLog(`[DEBUG] 神社クリック: ${shrine.name} | 神社座標: [${shrine.lat}, ${shrine.lng}] | 現在位置: [${currentPosition[0]}, ${currentPosition[1]}] | 距離: ${dist.toFixed(2)}m`);
          }
          onShowShrine(shrine.id);
        },
      }}
    />
  );
} 