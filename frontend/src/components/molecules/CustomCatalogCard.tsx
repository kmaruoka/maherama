
import CustomImage from '../atoms/CustomImage';

interface CustomCatalogCardProps {
  name: string;
  count: number;
  registeredAt: string;
  onClick?: () => void;
  countLabel?: string;
  type?: 'shrine' | 'diety';
  thumbnailUrl?: string;
}
export default function CustomCatalogCard({ name, count, registeredAt, onClick, countLabel = '参拝数', type, thumbnailUrl }: CustomCatalogCardProps) {
  const noImage = type === 'diety' ? '/images/noimage-diety.png' : '/images/noimage-shrine.png';
  const imageSrc = thumbnailUrl || noImage;
  return (
    <div className="card" style={{ width: '220px' }} onClick={onClick} role="button">
      <CustomImage src={imageSrc} alt={name} />
      <div className="card-body p-2">
        <div className="fw-bold mb-1">{name}</div>
        <div className="small text-muted mb-1">{countLabel}: {count}</div>
        <div className="small text-secondary">登録日: {registeredAt}</div>
      </div>
    </div>
  );
} 