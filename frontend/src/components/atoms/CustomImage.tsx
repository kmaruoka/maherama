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
      className={`custom-image ${className}`}
      style={{
        aspectRatio,
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        className="custom-image__img"
      />
    </div>
  );
}
