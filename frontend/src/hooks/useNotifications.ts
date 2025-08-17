import { useEffect, useState } from 'react';
import { API_BASE, apiCall } from '../config/api';

export interface Notification {
  id: number;
  title: string;
  type: 'info' | 'event' | 'maintenance' | 'release';
  is_read: boolean;
  created_at: string;
}

export interface NotificationDetail {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'event' | 'maintenance' | 'release';
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 通知取得開始:', `${API_BASE}/api/notifications`);
      const response = await apiCall(`${API_BASE}/api/notifications`);
      console.log('📡 通知取得レスポンス:', response);

      // ResponseオブジェクトからJSONデータを取得
      const data = await response.json();
      console.log('📄 通知取得データ:', data);

      if (data.success) {
        setNotifications(data.notifications);
        console.log('✅ 通知設定完了:', data.notifications.length, '件');
      } else {
        setError('通知の取得に失敗しました');
        console.error('❌ 通知取得失敗:', data);
      }
    } catch (err) {
      setError('通知の取得中にエラーが発生しました');
      console.error('通知取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await apiCall(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      // ResponseオブジェクトからJSONデータを取得
      const data = await response.json();

      if (data.success) {
        // 既読状態を更新
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
      }
    } catch (err) {
      console.error('既読更新エラー:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead
  };
}

export function useNotificationDetail(notificationId: number | null, onRead?: (notificationId: number) => void, onRefresh?: () => void) {
  const [notification, setNotification] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificationDetail = async () => {
    if (!notificationId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiCall(`${API_BASE}/api/notifications/${notificationId}`);

      // ResponseオブジェクトからJSONデータを取得
      const data = await response.json();

      if (data.success) {
        setNotification(data.notification);
        // 通知詳細取得時に既読状態を更新
        if (onRead) {
          onRead(notificationId);
        }
        // 通知リストを再取得
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError('通知詳細の取得に失敗しました');
      }
    } catch (err) {
      setError('通知詳細の取得中にエラーが発生しました');
      console.error('通知詳細取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (notificationId) {
      fetchNotificationDetail();
    } else {
      setNotification(null);
    }
  }, [notificationId]);

  return {
    notification,
    loading,
    error,
    fetchNotificationDetail
  };
}

export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      console.log('🔍 未読数取得開始:', `${API_BASE}/api/notifications/unread/count`);
      const response = await apiCall(`${API_BASE}/api/notifications/unread/count`);
      console.log('📡 未読数取得レスポンス:', response);

      // ResponseオブジェクトからJSONデータを取得
      const data = await response.json();
      console.log('📄 未読数取得データ:', data);

      if (data.success) {
        setCount(data.count);
        console.log('✅ 未読数設定完了:', data.count, '件');
      }
    } catch (err) {
      console.error('未読数取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  return {
    count,
    loading,
    fetchUnreadCount
  };
}
