import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExpandAlt, FaPlusCircle } from 'react-icons/fa';
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

  return (
    <div className="travel-logs-container">
      {canPost && (
        <div className="travel-logs-header">
          <button
            className="travel-logs-add-btn"
            onClick={onPostClick}
            title={t('postTravelLog')}
          >
            <FaPlusCircle size={24} />
          </button>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="travel-logs-empty">
          <div className="text-muted">{t('noData')}</div>
        </div>
      ) : (
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
      )}

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
          {pagination?.hasMore && (
            <CustomButton
              onClick={onLoadMore}
              disabled={isLoading}
              style={{ marginLeft: '8px', fontSize: '0.875rem', padding: '4px 8px' }}
            >
              {isLoading ? t('loading') : t('loadMore')}
            </CustomButton>
          )}
        </div>
      )}
    </div>
  );
}
