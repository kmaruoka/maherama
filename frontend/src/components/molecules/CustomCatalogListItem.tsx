import CustomText from '../atoms/CustomText';
import './CustomCatalogListItem.css';

interface CustomCatalogListItemProps {
  name: string;
  count: number;
  recordedDate: string;
  lastPrayedAt?: string;
  onClick?: () => void;
  countLabel?: string;
}

export default function CustomCatalogListItem({ name, count, recordedDate, lastPrayedAt, onClick, countLabel = '参拝数' }: CustomCatalogListItemProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return (
    <div className="d-flex justify-content-between align-items-center py-2 px-1 catalog-list-item" onClick={onClick} role="button" style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div className="catalog-list-col catalog-list-name">
        <CustomText className="fw-bold">{name}</CustomText>
      </div>
      <div className="catalog-list-col catalog-list-count">
        <CustomText className="modal-item-text small catalog-count">{countLabel}: {count}</CustomText>
      </div>
      <div className="catalog-list-col catalog-list-date">
        {recordedDate && (
          <CustomText className="small text-muted">収録日: {formatDate(recordedDate)}</CustomText>
        )}
        {lastPrayedAt && (
          <CustomText className="small text-muted">最終参拝: {formatDate(lastPrayedAt)}</CustomText>
        )}
      </div>
    </div>
  );
} 