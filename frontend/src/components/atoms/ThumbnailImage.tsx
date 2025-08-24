import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt } from 'react-icons/fa';
import CustomLink from './CustomLink';
import { ManagedImage } from './ManagedImage';

interface ThumbnailImageProps {
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

export const ThumbnailImage: React.FC<ThumbnailImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className = '',
  style,
  onLoad,
  onError,
  showLoadingOverlay = true,
  loadingText = '読み込み中...',
  shouldUseFallback = false,
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

  return (
    <div
      className={`${onClick ? 'pane__thumbnail cursor-pointer' : ''} ${className}`}
      style={style}
      onClick={handleContainerClick}
    >
      <ManagedImage
        src={src}
        alt={alt}
        fallbackSrc={fallbackSrc}
        className={onClick ? "pane__thumbnail-img" : ""}
        onLoad={onLoad}
        onError={onError}
        showLoadingOverlay={showLoadingOverlay}
        loadingText={loadingText}
        shouldUseFallback={shouldUseFallback}
        cacheKey={cacheKey}
      />

      {/* 右上のアクションボタン */}
      <div className="pane__thumbnail-actions">
        {showUploadButton && onUploadClick && (
          <button
            className="pane__icon-btn"
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
        <div className="pane__thumbnail-by">
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
