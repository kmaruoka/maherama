import CustomImage from '../atoms/CustomImage';
import { NOIMAGE_SHRINE_URL, NOIMAGE_SHRINE_DISPLAY_URL, NOIMAGE_DIETY_URL } from '../../constants';
import Card from 'react-bootstrap/Card';
import { useTranslation } from 'react-i18next';
import './CustomCatalogCard.css';
import { formatDisplayDate } from '../../utils/dateFormat';

export interface CustomCatalogCardProps {
  name: string;
  count: number;
  registeredAt: string;
  lastPrayedAt?: string;
  onClick: () => void;
  countLabel?: string;
  type: 'shrine' | 'diety';
  image_url?: string;
  dateLabel?: string;
}
export default function CustomCatalogCard({ name, count, registeredAt, lastPrayedAt, onClick, countLabel = '参拝数', type, image_url, dateLabel }: CustomCatalogCardProps) {
  const { t } = useTranslation();
  const noImage = type === 'diety' ? NOIMAGE_DIETY_URL : NOIMAGE_SHRINE_DISPLAY_URL;
  const imageSrc = image_url || noImage;
  return (
    <div className="catalog-card" onClick={onClick} role="button">
      <div className="catalog-card__thumbnail">
        <img src={imageSrc} alt={name} />
      </div>
      <div className="catalog-card__body">
        <div className="catalog-card__title">{name}</div>
        <div className="field-row">
          <span className="field-row__label">{t('count')}:</span>
          <span className="field-row__value">{count}</span>
        </div>
        <div className="field-row">
          <span className="field-row__label">{t('registeredAt')}:</span>
          <span className="field-row__value">{formatDisplayDate(registeredAt)}</span>
        </div>
        {lastPrayedAt && (
          <div className="field-row">
            <span className="field-row__label">{t('lastPrayedAt')}:</span>
            <span className="field-row__value">{formatDisplayDate(lastPrayedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
} 