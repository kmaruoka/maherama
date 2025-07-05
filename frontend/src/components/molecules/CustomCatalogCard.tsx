import React from 'react';
import CustomLink from '../atoms/CustomLink';

interface CustomCatalogCardProps {
  id: number;
  name: string;
  count: number;
  registeredAt?: string;
  thumbnailUrl?: string;
  onClick?: (id: number) => void;
  countLabel?: string;
}

const CustomCatalogCard: React.FC<CustomCatalogCardProps> = ({ id, name, count, registeredAt, thumbnailUrl, onClick, countLabel = '参拝数' }) => (
  <div className="card" style={{ width: '220px' }}>
    <div className="ratio ratio-16x9 mb-1">
      <img src={thumbnailUrl || '/vite.svg'} alt="thumb" className="card-img-top object-fit-cover" />
    </div>
    <div className="card-body p-2">
      <CustomLink onClick={onClick ? () => onClick(id) : undefined}>{name}</CustomLink>
      <div className="text-muted small">{countLabel}: {count}</div>
      {registeredAt && (
        <div className="text-muted small">登録日: {new Date(registeredAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</div>
      )}
    </div>
  </div>
);

export default CustomCatalogCard; 