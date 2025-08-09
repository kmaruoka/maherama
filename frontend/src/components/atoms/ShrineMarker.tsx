import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { NOIMAGE_SHRINE_URL } from '../../constants';
import { usePrayDistance, useCanPray, useWorshipLimit } from '../../hooks/usePrayDistance';
import useDebugLog from '../../hooks/useDebugLog';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useShrineMarkerStatus } from '../../hooks/useShrineMarkerStatus';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface Shrine {
  id: number;
  name: string;
  lat: number;
  lng: number;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
}

interface ShrineMarkerProps {
  shrine: Shrine;
  currentPosition: [number, number] | null;
  onShowShrine: (id: number) => void;
  zIndex?: number;
}

function createShrineIcon(
  image_url?: string,
  isInZukan: boolean = false,
  isPrayable: boolean = false,
  isRemotePrayable: boolean = false, // 未使用（互換性のため残す）
  isUnprayable: boolean = false,
  isRemoteUnavailable: boolean = false, // 未使用（互換性のため残す）
  isInRange: boolean = false,
  hasPrayedToday: boolean = false,
  tooltipText: string = '',
  imageCache: number = Date.now()
) {
  // 状態に応じたCSSクラスを決定
  const statusClasses = [];

  // 図鑑収録状態
  if (isInZukan) {
    statusClasses.push('shrine-marker-zukan');
  } else {
    statusClasses.push('shrine-marker-not-in-zukan');
  }

  // 参拝状態（参拝後は最優先）
  if (hasPrayedToday) {
    statusClasses.push('shrine-marker-prayed-today');
  } else if (isPrayable) {
    statusClasses.push('shrine-marker-prayable');
  } else if (isUnprayable) {
    statusClasses.push('shrine-marker-unprayable');
  }

  // 距離による透過度クラスを追加
  if (isInRange) {
    statusClasses.push('shrine-marker-in-range');
  } else {
    statusClasses.push('shrine-marker-out-of-range');
  }

  const statusClassString = statusClasses.join(' ');

  return L.divIcon({
    className: '',
    html: `
      <div class="shrine-marker-frame-anim ${statusClassString}">
        <div class="shrine-marker-frame-border"></div>
        <div class="shrine-marker-thumbnail-wrap">
          <img src="${(image_url || NOIMAGE_SHRINE_URL) + '?t=' + imageCache}" alt="shrine" onerror="this.onerror=null; this.src='${NOIMAGE_SHRINE_URL}?t=' + Date.now();" />
          <div class="shrine-marker-thumbnail-gloss ${isPrayable && !hasPrayedToday ? 'active' : ''}"></div>
        </div>
        <div class="shrine-marker-pin"></div>
        <div class="shrine-marker-status-tooltip">${tooltipText}</div>
      </div>
    `,
    iconSize: [68, 88], // サムネイル(66px) + ピン(20px) + 余白(2px)
    iconAnchor: [34, 88], // 下端中央
    popupAnchor: [0, -88],
  });
}

export default function ShrineMarker({ shrine, currentPosition, onShowShrine, zIndex }: ShrineMarkerProps) {
  const { t } = useTranslation();
  const debugLog = useDebugLog();
  const [userId] = useLocalStorageState<number | null>('userId', null);
  const [imageCache, setImageCache] = useState(Date.now());

  const { data: markerStatus } = useShrineMarkerStatus(shrine.id, userId);

  // 画像URLが変更された時にキャッシュを更新
  useEffect(() => {
    if (shrine.image_url_xs || shrine.image_url) {
      setImageCache(Date.now());
    }
  }, [shrine.image_url_xs, shrine.image_url]);

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
      shrine.image_url_xs || shrine.image_url,
      isInZukan,
      canPray,
      false, // isRemotePrayable: 常にfalse
      isUnprayable,
      false, // isRemoteUnavailable: 常にfalse
      canPray,
      markerStatus?.has_prayed_today ?? false,
      tooltipText,
      imageCache
    );
  }, [
    shrine.image_url_xs,
    shrine.image_url,
    isInZukan,
    canPray,
    isUnprayable,
    markerStatus?.has_prayed_today,
    tooltipText,
    imageCache
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
