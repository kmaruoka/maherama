import CustomText from '../atoms/CustomText';
import './CustomCatalogListItem.css';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../utils/dateFormat';
import { useSkin } from '../../skins/SkinContext';

interface CustomCatalogListItemProps {
  name: string;
  count: number;
  catalogedAt: string;
  lastPrayedAt?: string;
  onClick?: () => void;
  countLabel?: string;
  showLabels?: boolean;
}

export default function CustomCatalogListItem({ name, count, catalogedAt, lastPrayedAt, onClick, countLabel = '参拝数', showLabels = true }: CustomCatalogListItemProps) {
  const { t } = useTranslation();
  const { skin } = useSkin();

  const containerClass = `catalog-list-item${onClick ? ' catalog-list-item--clickable' : ''}`;

  return (
    <div
      className={containerClass}
      onClick={onClick}
      role="button"
    >
      <div className="catalog-list-item__row">
        <div className="catalog-list-item__col catalog-list-item__col--name">{name}</div>
        <div className="catalog-list-item__col catalog-list-item__col--count">
          {showLabels ? `${t('count')}: ` : ''}{count}
        </div>
        <div className="catalog-list-item__col catalog-list-item__col--date">
          <span className="small">
            {catalogedAt && (
              <>
                {showLabels && <span className="catalog-list-item__text--muted">{t('catalogedAt')}: </span>}
                <span className="catalog-list-item__text">{formatDisplayDate(catalogedAt)}</span>
              </>
            )}
            {catalogedAt && lastPrayedAt && <span className="catalog-list-item__separator"> / </span>}
            {lastPrayedAt && (
              <>
                {showLabels && <span className="catalog-list-item__text--muted">{t('lastPrayedAt')}: </span>}
                <span className="catalog-list-item__text">{formatDisplayDate(lastPrayedAt)}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
