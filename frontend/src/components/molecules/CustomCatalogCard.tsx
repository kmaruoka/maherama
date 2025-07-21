import CustomImage from '../atoms/CustomImage';
import { NOIMAGE_SHRINE_URL, NOIMAGE_DIETY_URL } from '../../constants';
import Card from 'react-bootstrap/Card';
import { useTranslation } from 'react-i18next';

interface CustomCatalogCardProps {
  name: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
  onClick?: () => void;
  countLabel?: string;
  type?: 'shrine' | 'diety';
  thumbnailUrl?: string;
  dateLabel?: string;
}
export default function CustomCatalogCard({ name, count, registeredAt, lastPrayedAt, onClick, countLabel = '参拝数', type, thumbnailUrl, dateLabel }: CustomCatalogCardProps) {
  const { t } = useTranslation();
  const noImage = type === 'diety' ? NOIMAGE_DIETY_URL : NOIMAGE_SHRINE_URL;
  const imageSrc = thumbnailUrl || noImage;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return (
    <Card style={{ width: '220px' }} onClick={onClick} role="button">
      <Card.Img as={CustomImage} src={imageSrc} alt={name} aspectRatio="1/1" />
      <Card.Body className="p-2">
        <div className="fw-bold mb-1">{name}</div>
        <div className="catalog-count mb-1">{t('count')}: {count}</div>
        <div className="small text-secondary">{t(dateLabel || 'registeredAt')}: {formatDate(registeredAt)}</div>
        {lastPrayedAt && (
          <div className="small text-secondary">{t('lastPrayedAt')}: {formatDate(lastPrayedAt)}</div>
        )}
      </Card.Body>
    </Card>
  );
} 