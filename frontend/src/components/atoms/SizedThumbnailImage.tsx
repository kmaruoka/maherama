import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt } from 'react-icons/fa';
import CustomLink from './CustomLink';
import type { ImageSize } from './SizedImage';
import './SizedThumbnailImage.css';

interface SizedThumbnailImageProps {
  size: ImageSize;
  url: string;
  alt: string;
  noImageUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  showLoadingOverlay?: boolean;
  loadingText?: string;
  shouldUseFallback?: boolean;
  // レスポンシブ対応
  responsive?: boolean;
  // アップロード関連
  onUploadClick?: () => void;
  showUploadButton?: boolean;
  // アップロードユーザー情報
  imageBy?: string;
  imageByUserId?: number;
  onShowUser?: (userId: number) => void;
  // クリックハンドラー
  onClick?: () => void;
  // サムネイルアクション（投票ボタンなど）
  thumbnailActions?: React.ReactNode;
  // キャッシュバスティング用
  cacheKey?: number;
}

const SIZE_CONFIG = {
  xs: {
    width: '64px',
    height: '64px',
    urlField: 'image_url_xs' as const
  },
  s: {
    width: '112px',
    height: '112px',
    urlField: 'image_url_s' as const
  },
  m: {
    width: '256px',
    height: '256px',
    urlField: 'image_url_m' as const
  },
  l: {
    width: '160px',
    height: '160px',
    urlField: 'image_url_l' as const
  },
  xl: {
    width: '1024px',
    height: '1024px',
    urlField: 'image_url_xl' as const
  }
};

const SizedThumbnailImage: React.FC<SizedThumbnailImageProps> = ({
  size,
  url,
  alt,
  noImageUrl,
  className = '',
  style,
  onLoad,
  onError,
  showLoadingOverlay = true,
  loadingText = '読み込み中...',
  shouldUseFallback = false,
  responsive = false,
  onUploadClick,
  showUploadButton = false,
  imageBy,
  imageByUserId,
  onShowUser,
  onClick,
  thumbnailActions,
  cacheKey
}) => {
  const { t } = useTranslation();
  const config = SIZE_CONFIG[size];

  // cacheKeyを使用してキャッシュバスティングを追加
  const imageUrlWithCache = cacheKey && url && url !== noImageUrl
    ? `${url}${url.includes('?') ? '&' : '?'}cache=${cacheKey}`
    : url || noImageUrl || '';





  const handleContainerClick = (e: React.MouseEvent) => {
    // ボタンやリンクがクリックされた場合はサムネイルクリックを無効化
    if ((e.target as HTMLElement).closest('button, a, .custom-link')) {
      return;
    }
    onClick?.();
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUploadClick?.();
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageByUserId && onShowUser) {
      onShowUser(imageByUserId);
    }
  };

  const containerStyle: React.CSSProperties = {
    width: responsive ? undefined : config.width,
    height: responsive ? undefined : config.height,
    ...style
  };

  return (
    <div
      className={`sized-thumbnail ${responsive ? 'sized-thumbnail--responsive' : `sized-thumbnail--${size}`} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={containerStyle}
      onClick={onClick ? handleContainerClick : undefined}
    >
      <img
        src={imageUrlWithCache}
        alt={alt}
        className="sized-thumbnail__img"
        onLoad={onLoad}
        onError={onError}
      />

      {/* 右上のアクションボタン */}
      <div className="sized-thumbnail__actions">
        {showUploadButton && onUploadClick && (
          <button
            className="sized-thumbnail__icon-btn"
            onClick={handleUploadClick}
            title={t('imageUpload')}
          >
            <FaCloudUploadAlt size={20} />
          </button>
        )}
        {thumbnailActions}
      </div>

      {/* 左下のアップロードユーザー名 */}
      {imageBy && (
        <div className="sized-thumbnail__by">
          {t('by')} {
            imageByUserId && onShowUser ? (
              <CustomLink
                onClick={handleUserClick}
                type="user"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {imageBy}
              </CustomLink>
            ) : (
              imageBy
            )
          }
        </div>
      )}
    </div>
  );
};

export default SizedThumbnailImage;
