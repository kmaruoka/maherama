import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { NOIMAGE_SHRINE_URL } from '../../constants';
import { usePrayDistance, useCanPray, useWorshipLimit } from '../../hooks/usePrayDistance';
import useDebugLog from '../../hooks/useDebugLog';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useShrineMarkerStatus } from '../../hooks/useShrineMarkerStatus';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
  isInRange: boolean = false,
  tooltipText: string = ''
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

  return L.divIcon({
    className: '',
    html: `
      <div class="shrine-marker-frame-anim ${statusClassString}">
        <div class="shrine-marker-frame-border"></div>
        <div class="shrine-marker-thumbnail-wrap">
          <img src="${(thumbnailUrl || NOIMAGE_SHRINE_URL) + '?t=' + Date.now()}" alt="shrine" />
          <div class="shrine-marker-thumbnail-gloss ${isPrayable ? 'active' : ''}"></div>
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
  const { t } = useTranslation();
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

  // ツールチップテキストを決定
  const tooltipText = useMemo(() => {
    if (isInZukan && canPray && isRemotePrayable) {
      return t('shrineMarkerZukanPrayableRemote');
    } else if (isInZukan && canPray) {
      return t('shrineMarkerZukanPrayable');
    } else if (isInZukan && isRemotePrayable) {
      return t('shrineMarkerZukanRemote');
    } else if (canPray && isRemotePrayable) {
      return t('shrineMarkerPrayableRemote');
    } else if (isInZukan) {
      return t('shrineMarkerZukan');
    } else if (canPray) {
      return t('shrineMarkerPrayable');
    } else if (isRemotePrayable) {
      return t('shrineMarkerRemote');
    } else if (isUnprayable) {
      return t('shrineMarkerUnprayable');
    } else if (isRemoteUnavailable) {
      return t('shrineMarkerRemoteUnavailable');
    } else {
      return t('shrineMarkerUnprayed');
    }
  }, [t, isInZukan, canPray, isRemotePrayable, isUnprayable, isRemoteUnavailable]);

  // createShrineIconをuseMemoでキャッシュ（DOM再生成を最小化）
  const icon = useMemo(() => {
    return createShrineIcon(
      shrine.thumbnailUrl,
      isInZukan,
      canPray,
      isRemotePrayable,
      isUnprayable,
      isRemoteUnavailable,
      canPray,
      tooltipText
    );
  }, [
    shrine.thumbnailUrl,
    isInZukan,
    canPray,
    isRemotePrayable,
    isUnprayable,
    isRemoteUnavailable,
    tooltipText
  ]);

  return (
    <Marker
      position={[shrine.lat, shrine.lng]}
      icon={icon}
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