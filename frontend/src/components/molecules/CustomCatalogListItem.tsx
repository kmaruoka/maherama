import CustomText from '../atoms/CustomText';
import './CustomCatalogListItem.css';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../utils/dateFormat';

interface CustomCatalogListItemProps {
  name: string;
  count: number;
  recordedDate: string;
  lastPrayedAt?: string;
  onClick?: () => void;
  countLabel?: string;
  showLabels?: boolean; // 追加
}

export default function CustomCatalogListItem({ name, count, recordedDate, lastPrayedAt, onClick, countLabel = '参拝数', showLabels = true }: CustomCatalogListItemProps) {
  const { t } = useTranslation();
  return (
    <div
      className="catalog-list-row"
      onClick={onClick}
      role="button"
      style={{ cursor: onClick ? 'pointer' : undefined, width: '100%', display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', minHeight: 56, height: 56, lineHeight: '56px', padding: '0 4px' }}
    >
      <div className="catalog-list-col name" style={{ flex: 5, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div className="catalog-list-col count" style={{ flex: 2, textAlign: 'right' }}>{showLabels ? `${t('count')}: ` : ''}{count}</div>
      <div className="catalog-list-col date" style={{ flex: 5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {(recordedDate || lastPrayedAt) && (
          <span className="small text-muted">
            {recordedDate && (showLabels ? `${t('registeredAt')}: ` : '')}{recordedDate ? formatDisplayDate(recordedDate) : ''}
            {recordedDate && lastPrayedAt && ' / '}
            {lastPrayedAt && (showLabels ? `${t('lastPrayedAt')}: ` : '')}{lastPrayedAt ? formatDisplayDate(lastPrayedAt) : ''}
          </span>
        )}
      </div>
    </div>
  );
} 