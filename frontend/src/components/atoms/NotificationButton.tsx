import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import './NotificationButton.css';

export const NotificationButton: React.FC = () => {
  const { count, loading } = useUnreadNotificationCount();
  const { openModal } = useModal();

  const handleClick = () => {
    // 通知モーダルを開く（IDは0を使用）
    openModal('notification', 0, true);
  };

  return (
    <button className="notification-button" onClick={handleClick}>
      <span className="notification-button-icon">📢</span>
      {!loading && count > 0 && (
        <span className="notification-button-badge">{count}</span>
      )}
    </button>
  );
};
