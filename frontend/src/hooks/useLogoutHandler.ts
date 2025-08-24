import { useCallback } from 'react';
import { useSecureAuth } from '../config/api';
import { useModal } from '../contexts/ModalContext';

export const useLogoutHandler = (onLogout: () => void) => {
  const { logout } = useSecureAuth();
  const { closeModal, setCurrentUserId } = useModal();

  const handleLogout = useCallback(() => {
    closeModal();
    logout();
    localStorage.removeItem('debugMode');
    localStorage.removeItem('maxShrineDisplay');
    localStorage.removeItem('skinName');
    localStorage.removeItem('barrierName');
    localStorage.removeItem('debugMapCenter');
    localStorage.removeItem('userId');
    setCurrentUserId(null);
    onLogout();
  }, [closeModal, logout, setCurrentUserId, onLogout]);

  return { handleLogout };
};
