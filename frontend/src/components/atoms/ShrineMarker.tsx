import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { NOIMAGE_SHRINE_URL } from '../../constants';
import { usePrayDistance, useCanPray, useWorshipLimit } from '../../hooks/usePrayDistance';
import useDebugLog from '../../hooks/useDebugLog';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useShrineMarkerStatus } from '../../hooks/useShrineMarkerStatus';
import { useState, useEffect } from 'react';

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

function createShrineIcon(
  thumbnailUrl?: string, 
  isInZukan: boolean = false,
  isPrayable: boolean = false,
  isRemotePrayable: boolean = false,
  isUnprayable: boolean = false,
  isRemoteUnavailable: boolean = false,
  isInRange: boolean = false
) {
  // 状態に応じたCSSクラスを決定
  const statusClasses = [];
  if (isInZukan) statusClasses.push('shrine-marker-zukan');
  if (isPrayable) {
    statusClasses.push('shrine-marker-prayable');
  } else if (isRemotePrayable) {
    statusClasses.push('shrine-marker-remote-prayable');
  }
  if (isUnprayable) statusClasses.push('shrine-marker-unprayable');
  if (isRemoteUnavailable) statusClasses.push('shrine-marker-remote-unavailable');
  
  // 距離による透過度クラスを追加
  if (isInRange) {
    statusClasses.push('shrine-marker-in-range');
  } else {
    statusClasses.push('shrine-marker-out-of-range');
  }
  
  const statusClassString = statusClasses.join(' ');
  
  // 状態アイコンを決定
  let statusIcon = '';
  if (isInZukan && isPrayable && isRemotePrayable) {
    statusIcon = '<div class="shrine-marker-status-icon zukan">★</div>';
  } else if (isInZukan && isPrayable) {
    statusIcon = '<div class="shrine-marker-status-icon zukan">✓</div>';
  } else if (isPrayable) {
    statusIcon = '<div class="shrine-marker-status-icon prayable">参</div>';
  } else if (isRemotePrayable) {
    statusIcon = '<div class="shrine-marker-status-icon remote-prayable">遥</div>';
  } else if (isUnprayable) {
    statusIcon = '<div class="shrine-marker-status-icon unprayable">遠</div>';
  } else if (isRemoteUnavailable) {
    statusIcon = '<div class="shrine-marker-status-icon remote-unavailable">限</div>';
  }

  // ツールチップテキストを決定
  let tooltipText = '';
  if (isInZukan && isPrayable && isRemotePrayable) {
    tooltipText = '図鑑収録済み・参拝可能・遥拝可能';
  } else if (isInZukan && isPrayable) {
    tooltipText = '図鑑収録済み・参拝可能';
  } else if (isInZukan && isRemotePrayable) {
    tooltipText = '図鑑収録済み・遥拝可能';
  } else if (isPrayable && isRemotePrayable) {
    tooltipText = '参拝可能・遥拝可能';
  } else if (isInZukan) {
    tooltipText = '図鑑収録済み';
  } else if (isPrayable) {
    tooltipText = '参拝可能';
  } else if (isRemotePrayable) {
    tooltipText = '遥拝可能';
  } else if (isUnprayable) {
    tooltipText = '参拝不可（距離外）';
  } else if (isRemoteUnavailable) {
    tooltipText = '遥拝不可（制限到達）';
  } else {
    tooltipText = '未参拝';
  }

  return L.divIcon({
    className: '',
    html: `
      <div class="shrine-marker-frame-anim ${statusClassString}">
        <div class="shrine-marker-frame-border"></div>
        <div class="shrine-marker-thumbnail-wrap">
          <img src="${thumbnailUrl || NOIMAGE_SHRINE_URL}" alt="shrine" />
          <div class="shrine-marker-thumbnail-gloss"></div>
        </div>
        <div class="shrine-marker-pin"></div>
        ${statusIcon}
        <div class="shrine-marker-status-tooltip">${tooltipText}</div>
      </div>
    `,
    iconSize: [120, 140], // サムネイル+ピン
    iconAnchor: [60, 140], // 下端中央
    popupAnchor: [0, -140],
  });
}

export default function ShrineMarker({ shrine, currentPosition, onShowShrine }: ShrineMarkerProps) {
  const debugLog = useDebugLog();
  const [userId] = useLocalStorageState<number | null>('userId', null);

  const { data: worshipLimit } = useWorshipLimit(userId);
  const [todayRemotePrayCount, setTodayRemotePrayCount] = useState<number | undefined>(undefined);
  const { data: markerStatus } = useShrineMarkerStatus(shrine.id, userId, worshipLimit?.today_worship_count, todayRemotePrayCount);
  useEffect(() => {
    if (markerStatus && typeof markerStatus.today_remote_pray_count === 'number') {
      setTodayRemotePrayCount(markerStatus.today_remote_pray_count);
    }
  }, [markerStatus?.today_remote_pray_count]);

  // 参拝距離・現在地から距離計算
  const { prayDistance, isLoading: isPrayDistanceLoading } = usePrayDistance(userId);
  const { distance, canPray } = useCanPray(currentPosition, shrine.lat, shrine.lng, prayDistance);

  // 状態をAPI値で決定
  const isInZukan = markerStatus?.is_in_zukan ?? false;
  const isRemotePrayable = (markerStatus?.can_remote_pray ?? false) && (markerStatus?.today_remote_pray_count === 0);
  const isUnprayable = !isPrayDistanceLoading && prayDistance !== null && distance !== null && !canPray;
  const isRemoteUnavailable = markerStatus ? (markerStatus.today_remote_pray_count > 0 || !markerStatus.can_remote_pray) : false;

  // // 参拝距離取得・判定に関する重要な調査用ログだけ直接console.logで出力
  // if (currentPosition && !isPrayDistanceLoading && markerStatus) {
  //   console.log(`[調査] マーカー状態: ${shrine.name} | 距離: ${distance?.toFixed(2)}m | API参拝可能距離: ${prayDistance}m | 参拝可能: ${canPray} | 図鑑収録: ${isInZukan} | 遥拝可能: ${isRemotePrayable}`);
  // }

  return (
    <Marker
      position={[shrine.lat, shrine.lng]}
      icon={createShrineIcon(
        shrine.thumbnailUrl,
        isInZukan,
        canPray,
        isRemotePrayable,
        isUnprayable,
        isRemoteUnavailable,
        canPray
      )}
      eventHandlers={{
        click: () => {
          if (currentPosition) {
            debugLog(`神社クリック: ${shrine.name} | 神社座標: [${shrine.lat}, ${shrine.lng}] | 現在位置: [${currentPosition[0]}, ${currentPosition[1]}] | 距離: ${distance?.toFixed(2)}m | 参拝可能距離: ${prayDistance}m | 図鑑収録: ${isInZukan} | 参拝可能: ${canPray} | 遥拝可能: ${isRemotePrayable}`);
          }
          onShowShrine(shrine.id);
        },
      }}
    />
  );
} 