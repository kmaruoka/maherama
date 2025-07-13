import React from 'react';

interface CustomImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string; // 例: '16/9', '4/3' など
}

export default function CustomImage({ src, alt = '', className = '', style = {}, aspectRatio = '1/1' }: CustomImageProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        aspectRatio,
        background: 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: 'var(--color-text)',
          display: 'block',
        }}
      />
    </div>
  );
}
