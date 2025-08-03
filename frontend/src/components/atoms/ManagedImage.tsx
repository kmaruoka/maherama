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
  loadingText = '読み込み中...'
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
      // リトライのため、srcを強制的に更新
      const img = e.target as HTMLImageElement;
      img.src = src + '?t=' + Date.now();
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

  // 画像URLが変更されたらリセット
  React.useEffect(() => {
    resetImageState();
  }, [src]);

  const displaySrc = imageLoadError ? fallbackSrc : src;
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