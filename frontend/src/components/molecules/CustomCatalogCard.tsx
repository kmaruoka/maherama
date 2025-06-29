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
  <div className="border p-2 rounded bg-white flex flex-col w-[220px]">
    <div className="w-full aspect-video bg-gray-100 mb-1 overflow-hidden rounded">
      <img src={thumbnailUrl || '/vite.svg'} alt="thumb" className="w-full h-full object-cover" />
    </div>
    <CustomLink onClick={onClick ? () => onClick(id) : undefined}>{name}</CustomLink>
    <div className="text-sm text-gray-600">{countLabel}: {count}</div>
    {registeredAt && (
      <div className="text-xs text-gray-400 mt-1">登録日: {new Date(registeredAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</div>
    )}
  </div>
);

export default CustomCatalogCard; 