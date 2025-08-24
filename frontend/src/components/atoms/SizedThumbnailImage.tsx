import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt } from 'react-icons/fa';
import CustomLink from './CustomLink';
import type { ImageSize } from './SizedImage';
import './SizedThumbnailImage.css';

// 画像URLの型定義
interface ImageUrls {
  xs?: string;
  s?: string;
  m?: string;
  l?: string;
  xl?: string;
}

// レスポンシブ設定の型定義
interface ResponsiveBreakpoint {
  minWidth?: number;
  maxWidth?: number;
  size: ImageSize;
}

interface ResponsiveConfig {
  breakpoints: ResponsiveBreakpoint[];
  defaultSize: ImageSize;
}

// アップロード関連の型定義
interface UploadProps {
  onUploadClick?: () => void;
  showUploadButton?: boolean;
}

// ユーザー情報の型定義
interface UserInfoProps {
  imageBy?: string;
  imageByUserId?: number;
  onShowUser?: (userId: number) => void;
}

// アクションの型定義
interface ActionProps {
  thumbnailActions?: React.ReactNode;
  onClick?: () => void;
}

// メインのProps型定義
interface SizedThumbnailImageProps {
  // 基本プロパティ
  alt: string;
  className?: string;
  style?: React.CSSProperties;

  // 画像関連
  images: ImageUrls;
  noImageUrl: string;

  // レスポンシブ設定
  responsive?: boolean;
  responsiveConfig?: ResponsiveConfig;

  // サイズ設定（非レスポンシブ時）
  size?: ImageSize;

  // 拡大表示設定
  expanded?: boolean;

  // イベントハンドラー
  onLoad?: () => void;
  onError?: () => void;

  // キャッシュ
  cacheKey?: number;

  // 機能的なProps
  upload?: UploadProps;
  userInfo?: UserInfoProps;
  actions?: ActionProps;

  // 表示設定
  showLoadingOverlay?: boolean;
  loadingText?: string;
  shouldUseFallback?: boolean;
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
    width: '512px',
    height: '512px',
    urlField: 'image_url_l' as const
  },
  xl: {
    width: '1024px',
    height: '1024px',
    urlField: 'image_url_xl' as const
  }
};

// デフォルトのレスポンシブ設定
const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  breakpoints: [
    { minWidth: 1400, size: 'xl' }, // XXL（1400px以上）: XLサイズ
    { minWidth: 1200, size: 'l' },  // XL（1200px以上）: Lサイズ
    { minWidth: 992, size: 'm' },   // LG（992px以上）: Mサイズ
    { minWidth: 768, size: 's' },   // MD（768px以上）: Sサイズ
    { maxWidth: 767, size: 'xs' }   // SM以下（767px以下）: XSサイズ
  ],
  defaultSize: 's'
};

const SizedThumbnailImage: React.FC<SizedThumbnailImageProps> = ({
  // 基本プロパティ
  alt,
  className = '',
  style,

  // 画像関連
  images,
  noImageUrl,

  // レスポンシブ設定
  responsive = false,
  responsiveConfig = DEFAULT_RESPONSIVE_CONFIG,

  // サイズ設定（非レスポンシブ時）
  size = 'm',

  // 拡大表示設定
  expanded = false,

  // イベントハンドラー
  onLoad,
  onError,

  // キャッシュ
  cacheKey,

  // 機能的なProps
  upload,
  userInfo,
  actions,

  // 表示設定
  showLoadingOverlay = true,
  loadingText = '読み込み中...',
  shouldUseFallback = false
}) => {
  const { t } = useTranslation();
  const config = SIZE_CONFIG[size];

  // レスポンシブ用の画像URLを整理（存在する画像のみ）
  const responsiveUrls = {
    xs: images.xs,
    s: images.s,
    m: images.m,
    l: images.l,
    xl: images.xl
  };

  // 存在する画像のみをフィルタリング
  const getValidImageUrl = (size: ImageSize): string | undefined => {
    const url = responsiveUrls[size];
    return url && url !== noImageUrl ? url : undefined;
  };

  // cacheKeyを使用してキャッシュバスティングを追加
  const addCacheKey = (imageUrl: string | undefined) => {
    if (cacheKey && imageUrl && imageUrl !== noImageUrl) {
      return `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}cache=${cacheKey}`;
    }
    return imageUrl || noImageUrl || '';
  };

  // レスポンシブ対応の画像要素を生成
  const renderResponsiveImage = () => {
    if (!responsive) {
      // 非レスポンシブの場合は指定されたサイズの画像を使用
      const imageUrl = getValidImageUrl(size) || noImageUrl;
      return (
        <img
          src={addCacheKey(imageUrl)}
          alt={alt}
          className="sized-thumbnail__img"
          onLoad={onLoad}
          onError={onError}
        />
      );
    }

    // レスポンシブの場合は<picture>要素を使用
    // 存在する画像のみをsourceタグに含める
    const validSources = responsiveConfig.breakpoints
      .map((breakpoint, index) => {
        const imageUrl = getValidImageUrl(breakpoint.size);
        if (!imageUrl) return null;

        let mediaQuery = '';
        if (breakpoint.minWidth !== undefined && breakpoint.maxWidth !== undefined) {
          mediaQuery = `(min-width: ${breakpoint.minWidth}px) and (max-width: ${breakpoint.maxWidth}px)`;
        } else if (breakpoint.minWidth !== undefined) {
          mediaQuery = `(min-width: ${breakpoint.minWidth}px)`;
        } else if (breakpoint.maxWidth !== undefined) {
          mediaQuery = `(max-width: ${breakpoint.maxWidth}px)`;
        }

        return (
          <source
            key={index}
            srcSet={addCacheKey(imageUrl)}
            media={mediaQuery}
          />
        );
      })
      .filter(Boolean);

    // フォールバック用の画像URLを決定
    const fallbackUrl = getValidImageUrl(responsiveConfig.defaultSize) ||
                       Object.values(responsiveUrls).find(url => url && url !== noImageUrl) ||
                       noImageUrl;

    return (
      <picture>
        {validSources}
        {/* フォールバック: 存在する画像またはnoImageUrl */}
        <img
          src={addCacheKey(fallbackUrl)}
          alt={alt}
          className="sized-thumbnail__img"
          onLoad={onLoad}
          onError={onError}
        />
      </picture>
    );
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // ボタンやリンクがクリックされた場合はサムネイルクリックを無効化
    if ((e.target as HTMLElement).closest('button, a, .custom-link')) {
      return;
    }
    actions?.onClick?.();
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    upload?.onUploadClick?.();
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userInfo?.imageByUserId && userInfo?.onShowUser) {
      userInfo.onShowUser(userInfo.imageByUserId);
    }
  };

  const containerStyle: React.CSSProperties = {
    width: responsive ? undefined : config.width,
    height: responsive ? undefined : config.height,
    ...style
  };

  // 拡大表示の場合は特殊なクラスを適用
  const containerClassName = expanded
    ? `sized-thumbnail sized-thumbnail--expanded ${className}`
    : `sized-thumbnail ${responsive ? 'sized-thumbnail--responsive' : `sized-thumbnail--${size}`} ${actions?.onClick ? 'cursor-pointer' : ''} ${className}`;

  return (
    <div
      className={containerClassName}
      style={containerStyle}
      onClick={actions?.onClick ? handleContainerClick : undefined}
    >
      {renderResponsiveImage()}

      {/* 右上のアクションボタン */}
      <div className="sized-thumbnail__actions">
        {upload?.showUploadButton && upload?.onUploadClick && (
          <button
            className="sized-thumbnail__icon-btn"
            onClick={handleUploadClick}
            title={t('imageUpload')}
          >
            <FaCloudUploadAlt size={20} />
          </button>
        )}
        {actions?.thumbnailActions}
      </div>

      {/* 左下のアップロードユーザー名 */}
      {userInfo?.imageBy && (
        <div className="sized-thumbnail__by">
          {t('by')} {
            userInfo.imageByUserId && userInfo.onShowUser ? (
              <CustomLink
                onClick={handleUserClick}
                type="user"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {userInfo.imageBy}
              </CustomLink>
            ) : (
              userInfo.imageBy
            )
          }
        </div>
      )}
    </div>
  );
};

export default SizedThumbnailImage;
