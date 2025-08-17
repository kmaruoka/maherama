import React, { forwardRef, useEffect, useState } from 'react';
import type { Notification } from '../../hooks/useNotifications';
import { useNotificationDetail, useNotifications } from '../../hooks/useNotifications';
import './NotificationPane.css';

interface NotificationPaneProps {
  onDataLoaded?: (name: string) => void;
}

export interface NotificationPaneRef {
  backToOverview: () => void;
  getTitle: () => string;
}

export const NotificationPane = forwardRef<NotificationPaneRef, NotificationPaneProps>(
  ({ onDataLoaded }, ref) => {
    const { notifications, loading, markAsRead, fetchNotifications } = useNotifications();
    const [selectedNotificationId, setSelectedNotificationId] = useState<number | null>(null);
    const { notification: selectedNotification, loading: detailLoading } = useNotificationDetail(selectedNotificationId, markAsRead, fetchNotifications);

    const handleNotificationClick = async (notification: Notification) => {
      setSelectedNotificationId(notification.id);
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    };

    const handleBackToList = () => {
      setSelectedNotificationId(null);
    };

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'release':
          return '📱';
        case 'event':
          return '🎊';
        case 'maintenance':
          return '🔧';
        case 'info':
          return 'ℹ️';
        default:
          return '📢';
      }
    };

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'release':
          return 'notification-type-release';
        case 'event':
          return 'notification-type-event';
        case 'maintenance':
          return 'notification-type-maintenance';
        case 'info':
          return 'notification-type-info';
        default:
          return 'notification-type-info';
      }
    };

    // refの実装
    useEffect(() => {
      if (ref) {
        (ref as React.MutableRefObject<NotificationPaneRef>).current = {
          backToOverview: handleBackToList,
          getTitle: () => selectedNotificationId ? 'お知らせ詳細' : 'お知らせ'
        };
      }
    }, [ref, selectedNotificationId]);

    // タイトル更新
    useEffect(() => {
      if (onDataLoaded) {
        onDataLoaded(selectedNotificationId ? 'お知らせ詳細' : 'お知らせ');
      }
    }, [onDataLoaded, selectedNotificationId]);

    return (
      <div className="notification-pane">
        {selectedNotificationId ? (
          // 詳細表示
          <div className="notification-detail">
            {detailLoading ? (
              <div className="notification-loading">読み込み中...</div>
            ) : selectedNotification ? (
              <>
                <div className="notification-detail-header">
                  <span className={`notification-type-badge ${getTypeColor(selectedNotification.type)}`}>
                    {getTypeIcon(selectedNotification.type)}
                  </span>
                  <h3 className="notification-detail-title">{selectedNotification.title}</h3>
                  <div className="notification-detail-date">
                    {new Date(selectedNotification.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                <div className="notification-detail-content">
                  {selectedNotification.content.split('\n').map((line, index) => (
                    <p key={index} className="notification-detail-line">
                      {line}
                    </p>
                  ))}
                </div>
                <button className="notification-back-button" onClick={handleBackToList}>
                  一覧に戻る
                </button>
              </>
            ) : (
              <div className="notification-error">通知の詳細を取得できませんでした</div>
            )}
          </div>
        ) : (
          // 一覧表示
          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">読み込み中...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">📭</div>
                <p>新しいお知らせはありません</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'notification-unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-header">
                    <span className={`notification-type-badge ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </span>
                    <span className="notification-item-title">{notification.title}</span>
                    {!notification.is_read && (
                      <span className="notification-unread-badge">NEW</span>
                    )}
                  </div>
                  <div className="notification-item-date">
                    {new Date(notification.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
);

NotificationPane.displayName = 'NotificationPane';
