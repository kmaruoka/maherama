import CustomImage from '../atoms/CustomImage';
import { NOIMAGE_SHRINE_URL, NOIMAGE_DIETY_URL } from '../../constants';

interface CustomCatalogCardProps {
  name: string;
  count: number;
  registeredAt: string;
  onClick?: () => void;
  countLabel?: string;
  type?: 'shrine' | 'diety';
  thumbnailUrl?: string;
  dateLabel?: string;
}
export default function CustomCatalogCard({ name, count, registeredAt, onClick, countLabel = '参拝数', type, thumbnailUrl, dateLabel }: CustomCatalogCardProps) {
  const noImage = type === 'diety' ? NOIMAGE_DIETY_URL : NOIMAGE_SHRINE_URL;
  const imageSrc = thumbnailUrl || noImage;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return (
    <div className="card" style={{ width: '220px' }} onClick={onClick} role="button">
      <CustomImage src={imageSrc} alt={name} />
      <div className="card-body p-2">
        <div className="fw-bold mb-1">{name}</div>
        <div className="catalog-count mb-1">参拝数: {count}</div>
        <div className="small text-secondary">{dateLabel || '登録日'}: {formatDate(registeredAt)}</div>
      </div>
    </div>
  );
} 