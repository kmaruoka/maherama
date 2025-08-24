import React from 'react';
import { useImageLoading } from '../../hooks/useImageManagement';

interface ManagedImageProps {
  src: string;
  alt: string;
  fallbackSrc: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  showLoadingOverlay?: boolean;
  loadingText?: string;
  shouldUseFallback?: boolean;
  // キャッシュバスティング用のプロパティ
  cacheKey?: number;
}

export const ManagedImage: React.FC<ManagedImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className,
  style,
  onLoad,
  onError,
  showLoadingOverlay = true,
  loadingText = '読み込み中...',
  shouldUseFallback = false,
  cacheKey
}) => {
  const {
    retryCount,
    imageLoadError,
    isImageLoading,
    handleImageError,
    handleImageLoad,
    handleImageLoadStart,
    resetImageState
  } = useImageLoading();

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const shouldRetry = handleImageError();
    if (shouldRetry) {
      // リトライのため、srcを強制的に更新（リトライカウントを使用）
      const img = e.target as HTMLImageElement;
      img.src = src + (src.includes('?') ? '&' : '?') + 'retry=' + retryCount;
    } else {
      onError?.();
    }
  };

  const handleLoad = () => {
    handleImageLoad();
    onLoad?.();
  };

  const handleLoadStart = () => {
    handleImageLoadStart();
  };

  // 画像URLが変更されたらリセット（無限ループを防ぐため条件を追加）
  React.useEffect(() => {
    // キャッシュバスティングのクエリパラメータを除去してベースURLを取得
    const baseSrc = src.split('?')[0];
    const baseFallbackSrc = fallbackSrc.split('?')[0];

    // 同じベースURLの場合はリセットしない、またfallbackSrcの場合はリセットしない
    if (baseSrc !== baseFallbackSrc && !src.includes('retry=')) {
      resetImageState();
    }
  }, [src, fallbackSrc, resetImageState]);

  // キャッシュバスティング付きのsrcを生成
  const getCachedSrc = (baseSrc: string) => {
    if (isNoImage) return baseSrc;

    const separator = baseSrc.includes('?') ? '&' : '?';
    const cacheParam = cacheKey ? `cache=${cacheKey}` : `t=${Date.now()}`;
    return `${baseSrc}${separator}${cacheParam}`;
  };

  // NoImageの場合は無限ループを防ぐため、fallbackを使用しない
  const isNoImage = src === fallbackSrc || src.includes('noimage') || src.includes('null');
  // キャッシュバスティング付きの表示用src
  const displaySrc = isNoImage ? fallbackSrc :
    ((imageLoadError || shouldUseFallback) ? fallbackSrc : getCachedSrc(src));
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    ...style
  };

  return (
    <div className={className} style={containerStyle}>
      {isImageLoading && showLoadingOverlay && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>{loadingText}</div>
        </div>
      )}
      <img
        src={displaySrc}
        alt={alt}
        style={{
          width: '100%',
          height: 'auto',
          opacity: isImageLoading ? 0.5 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
        onError={handleError}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
      />
    </div>
  );
};
