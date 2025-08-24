import { useEffect } from 'react';

export const useNotificationModalListener = (openModal: (type: "user" | "mission" | "shrine" | "diety" | "notification", id: number, clearHistory?: boolean) => void) => {
  useEffect(() => {
    const handleOpenNotificationModal = () => {
      openModal('notification', 0, true);
    };

    window.addEventListener('openNotificationModal', handleOpenNotificationModal);
    return () => {
      window.removeEventListener('openNotificationModal', handleOpenNotificationModal);
    };
  }, [openModal]);
};
