import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCompressAlt, FaExpandAlt, FaPlus } from 'react-icons/fa';
import { formatDisplayDate } from '../../utils/dateFormat';
import { CustomButton } from '../atoms/CustomButton';
import CustomLink from '../atoms/CustomLink';

// TravelLogインターフェースを直接定義
interface TravelLog {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
  };
}

interface TravelLogsDisplayProps {
  logs: TravelLog[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  isLoading?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onLoadMore?: () => void;
  onShowUser?: (userId: number) => void;
  canPost?: boolean;
  onPostClick?: () => void;
  maxPreviewItems?: number;
}

export function TravelLogsDisplay({
  logs,
  pagination,
  isLoading = false,
  isExpanded = false,
  onToggleExpand,
  onLoadMore,
  onShowUser,
  canPost = false,
  onPostClick,
  maxPreviewItems = 3
}: TravelLogsDisplayProps) {
  const { t } = useTranslation();
  const [displayLogs, setDisplayLogs] = useState<TravelLog[]>([]);

  useEffect(() => {
    if (isExpanded) {
      setDisplayLogs(logs);
    } else {
      setDisplayLogs(logs.slice(0, maxPreviewItems));
    }
  }, [logs, isExpanded, maxPreviewItems]);

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (isLoading && logs.length === 0) {
    return <div className="text-muted">{t('loading')}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="travel-logs-empty">
        <div className="text-muted">{t('noData')}</div>
        {canPost && (
          <CustomButton
            onClick={onPostClick}
            color="#28a745"
            hoverColor="#218838"
            style={{ marginTop: '8px' }}
          >
            <FaPlus /> {t('postTravelLog')}
          </CustomButton>
        )}
      </div>
    );
  }

  return (
    <div className="travel-logs-container">
      {!isExpanded && canPost && (
        <div className="travel-logs-header">
          <CustomButton
            onClick={onPostClick}
            color="#28a745"
            hoverColor="#218838"
            size="small"
          >
            <FaPlus /> {t('postTravelLog')}
          </CustomButton>
        </div>
      )}

      <div className="travel-logs-list">
        {displayLogs.map((log) => (
          <div key={log.id} className="travel-log-item">
            <div className="travel-log-header">
              <CustomLink
                onClick={() => onShowUser?.(log.user.id)}
                type="user"
              >
                {log.user.name}
              </CustomLink>
              <span className="travel-log-date">
                {formatDisplayDate(log.created_at)}
              </span>
            </div>
            <div className="travel-log-content">
              {isExpanded ? log.content : truncateContent(log.content)}
            </div>
          </div>
        ))}
      </div>

      {!isExpanded && logs.length > maxPreviewItems && (
        <div className="travel-logs-footer">
          <button
            className="btn btn-link btn-sm"
            onClick={onToggleExpand}
          >
            {t('viewAll')} ({logs.length}件)
            <FaExpandAlt size={12} style={{ marginLeft: '4px' }} />
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="travel-logs-expanded-footer">
          <button
            className="btn btn-link btn-sm"
            onClick={onToggleExpand}
          >
            <FaCompressAlt size={12} style={{ marginRight: '4px' }} />
            {t('collapse')}
          </button>

          {pagination?.hasMore && (
            <CustomButton
              onClick={onLoadMore}
              disabled={isLoading}
              size="small"
              style={{ marginLeft: '8px' }}
            >
              {isLoading ? t('loading') : t('loadMore')}
            </CustomButton>
          )}
        </div>
      )}
    </div>
  );
}
