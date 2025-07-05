import CustomText from '../atoms/CustomText';
import './CustomCatalogListItem.css';

interface CustomCatalogListItemProps {
  name: string;
  count: number;
  onClick?: () => void;
  countLabel?: string;
}

export default function CustomCatalogListItem({ name, count, onClick, countLabel = '参拝数' }: CustomCatalogListItemProps) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 px-1 catalog-list-item" onClick={onClick} role="button" style={{ cursor: onClick ? 'pointer' : undefined }}>
      <CustomText className="fw-bold">{name}</CustomText>
      <CustomText className="modal-item-text ms-2 small catalog-count">{countLabel}: {count}</CustomText>
    </div>
  );
} 