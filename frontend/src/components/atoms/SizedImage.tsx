import React from 'react';
import './SizedImage.css';

export type ImageSize = 'xs' | 's' | 'm' | 'l' | 'xl';

interface SizedImageProps {
  size: ImageSize;
  url: string;
  alt: string;
  noImageUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
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

const SizedImage: React.FC<SizedImageProps> = ({
  size,
  url,
  alt,
  noImageUrl,
  className = '',
  style,
  onClick
}) => {
  const config = SIZE_CONFIG[size];
  const imageUrl = url || noImageUrl || '';

  const imageStyle: React.CSSProperties = {
    width: config.width,
    height: config.height,
    ...style
  };

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`sized-image sized-image--${size} ${className}`}
      style={imageStyle}
      onClick={onClick}
    />
  );
};

export default SizedImage;
