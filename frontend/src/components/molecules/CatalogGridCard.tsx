import React from 'react';
import { useTranslation } from 'react-i18next';
import { NOIMAGE_DIETY_URL, NOIMAGE_SHRINE_DISPLAY_URL } from '../../constants';
import GridCard from '../atoms/GridCard';

interface CatalogGridCardProps {
  name: string;
  count: number;
  catalogedAt: string;
  lastPrayedAt?: string;
  onClick?: () => void;
  type?: 'shrine' | 'diety';
  image_url?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
}

const CatalogGridCard: React.FC<CatalogGridCardProps> = ({
  name,
  count,
  catalogedAt,
  lastPrayedAt,
  onClick,
  type = 'shrine',
  image_url,
  image_url_s,
  image_url_m,
  image_url_l
}) => {
  const { t } = useTranslation();

  // 画像URLの優先順位: l > m > s > デフォルト
  const noImage = type === 'diety' ? NOIMAGE_DIETY_URL : NOIMAGE_SHRINE_DISPLAY_URL;
  const imageUrl = image_url_l || image_url_m || image_url_s || image_url || noImage;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <GridCard
      title={name}
      imageUrl={imageUrl}
      onClick={onClick}
      variant="default"
    >
      <div className="catalog-grid-card__content">
        <div className="catalog-grid-card__field">
          <span className="catalog-grid-card__label">{t('count')}:</span>
          <span className="catalog-grid-card__value">{count}</span>
        </div>
        <div className="catalog-grid-card__field">
          <span className="catalog-grid-card__label">{t('catalogedAt')}:</span>
          <span className="catalog-grid-card__value">{formatDate(catalogedAt)}</span>
        </div>
        {lastPrayedAt && (
          <div className="catalog-grid-card__field">
            <span className="catalog-grid-card__label">{t('lastPrayedAt')}:</span>
            <span className="catalog-grid-card__value">{formatDate(lastPrayedAt)}</span>
          </div>
        )}
      </div>
    </GridCard>
  );
};

export default CatalogGridCard;
