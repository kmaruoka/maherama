import { useEffect } from 'react';
import { useSecureAuth } from '../config/api';
import { useModal } from '../contexts/ModalContext';

export const useAuthInitialization = () => {
  const { isAuthenticated } = useSecureAuth();
  const { setCurrentUserId } = useModal();

  useEffect(() => {
    if (isAuthenticated()) {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          if (parsedUserData && parsedUserData.id) {
            setCurrentUserId(parsedUserData.id);
          }
        } catch (error) {
          console.error('[AppMain] ユーザーデータの解析に失敗:', error);
        }
      }
    } else {
      setCurrentUserId(null);
    }
  }, [isAuthenticated, setCurrentUserId]);
};
