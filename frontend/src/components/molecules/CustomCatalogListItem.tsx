import CustomText from '../atoms/CustomText';
import './CustomCatalogListItem.css';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

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
    <Row className="align-items-center py-2 px-1 border-bottom" onClick={onClick} role="button" style={{ cursor: onClick ? 'pointer' : undefined }}>
      <Col sm={5} className="fw-bold text-start">
        <CustomText>{name}</CustomText>
      </Col>
      <Col sm={2} className="text-end">
        <CustomText className="modal-item-text">{countLabel}: {count}</CustomText>
      </Col>
      <Col className="modal-item-text text-end flex-grow-1" style={{ minWidth: 240 }}>
        {(recordedDate || lastPrayedAt) && (
          <CustomText className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
            {recordedDate && `収録日: ${formatDate(recordedDate)}`}
            {recordedDate && lastPrayedAt && ' / '}
            {lastPrayedAt && `最終参拝: ${formatDate(lastPrayedAt)}`}
          </CustomText>
        )}
      </Col>
    </Row>
  );
} 