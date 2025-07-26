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
  zIndex?: number;
}

function createShrineIcon(
  thumbnailUrl?: string, 
  isInZukan: boolean = false,
  isPrayable: boolean = false,
  isRemotePrayable: boolean = false, // 未使用（互換性のため残す）
  isUnprayable: boolean = false,
  isRemoteUnavailable: boolean = false, // 未使用（互換性のため残す）
  isInRange: boolean = false,
  tooltipText: string = ''
) {
  // 状態に応じたCSSクラスを決定（遥拝関連を除外）
  const statusClasses = [];
  if (isInZukan) statusClasses.push('shrine-marker-zukan');
  if (isPrayable) {
    statusClasses.push('shrine-marker-prayable');
  }
  if (isUnprayable) statusClasses.push('shrine-marker-unprayable');
  
  // 距離による透過度クラスを追加
  if (isInRange) {
    statusClasses.push('shrine-marker-in-range');
  } else {
    statusClasses.push('shrine-marker-out-of-range');
  }
  
  const statusClassString = statusClasses.join(' ');
  
  // 状態アイコンを決定（遥拝関連を除外）
  let statusIcon = '';
  if (isInZukan && isPrayable) {
    statusIcon = '<div class="shrine-marker-status-icon zukan">★</div>';
  } else if (isInZukan) {
    statusIcon = '<div class="shrine-marker-status-icon zukan">✓</div>';
  } else if (isPrayable) {
    statusIcon = '<div class="shrine-marker-status-icon prayable">参</div>';
  } else if (isUnprayable) {
    statusIcon = '<div class="shrine-marker-status-icon unprayable">遠</div>';
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

export default function ShrineMarker({ shrine, currentPosition, onShowShrine, zIndex }: ShrineMarkerProps) {
  const { t } = useTranslation();
  const debugLog = useDebugLog();
  const [userId] = useLocalStorageState<number | null>('userId', null);

  const { data: markerStatus } = useShrineMarkerStatus(shrine.id, userId);

  // 参拝距離・現在地から距離計算
  const { prayDistance, isLoading: isPrayDistanceLoading } = usePrayDistance(userId);
  const { distance, canPray } = useCanPray(currentPosition, shrine.lat, shrine.lng, prayDistance);

  // 状態をAPI値で決定（遥拝関連は表示しない）
  const isInZukan = markerStatus?.is_in_zukan ?? false;
  const isUnprayable = !isPrayDistanceLoading && prayDistance !== null && distance !== null && !canPray;

  // ツールチップテキストを決定（遥拝関連は除外）
  const tooltipText = useMemo(() => {
    if (isInZukan && canPray) {
      return t('shrineMarkerZukanPrayable');
    } else if (isInZukan) {
      return t('shrineMarkerZukan');
    } else if (canPray) {
      return t('shrineMarkerPrayable');
    } else if (isUnprayable) {
      return t('shrineMarkerUnprayable');
    } else {
      return t('shrineMarkerUnprayed');
    }
  }, [t, isInZukan, canPray, isUnprayable]);

  // createShrineIconをuseMemoでキャッシュ（DOM再生成を最小化）
  const icon = useMemo(() => {
    return createShrineIcon(
      shrine.thumbnailUrl,
      isInZukan,
      canPray,
      false, // isRemotePrayable: 常にfalse
      isUnprayable,
      false, // isRemoteUnavailable: 常にfalse
      canPray,
      tooltipText
    );
  }, [
    shrine.thumbnailUrl,
    isInZukan,
    canPray,
    isUnprayable,
    tooltipText
  ]);

  return (
    <Marker
      position={[shrine.lat, shrine.lng]}
      icon={icon}
      zIndexOffset={zIndex || 0}
      eventHandlers={{
        click: () => {
          if (currentPosition) {
            debugLog(`神社クリック: ${shrine.name} | 神社座標: [${shrine.lat}, ${shrine.lng}] | 現在位置: [${currentPosition[0]}, ${currentPosition[1]}] | 距離: ${distance?.toFixed(2)}m | 参拝可能距離: ${prayDistance}m | 図鑑収録: ${isInZukan} | 参拝可能: ${canPray}`);
          }
          onShowShrine(shrine.id);
        },
      }}
    />
  );
} 