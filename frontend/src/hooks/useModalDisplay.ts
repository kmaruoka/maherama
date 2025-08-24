import { useCallback, useRef } from 'react';
import { type NotificationPaneRef } from '../components/organisms/NotificationPane';
import { useSecureAuth } from '../config/api';
import { useModal } from '../contexts/ModalContext';

interface PaneRef {
  backToOverview: () => void;
  getTitle: () => string;
}

export const useModalDisplay = () => {
  const {
    modal,
    currentUserId,
    openModal,
    closeModal,
    updateCurrentModalName,
    navigationHistory,
    historyIndex
  } = useModal();
  const { isAuthenticated } = useSecureAuth();

  // openModalの型を調整
  const openModalWithString = (type: string, id: number, force?: boolean) => {
    openModal(type as any, id, force);
  };

  // 各ペインコンポーネントへのref
  const shrinePaneRef = useRef<PaneRef>(null);
  const dietyPaneRef = useRef<PaneRef>(null);
  const userPaneRef = useRef<PaneRef>(null);
  const myPageRef = useRef<PaneRef>(null);
  const missionPaneRef = useRef<PaneRef>(null);
  const notificationPaneRef = useRef<NotificationPaneRef>(null);

  // モーダルタイトルを取得
  const getModalTitle = useCallback(() => {
    if (!modal) return '';

    // 履歴からタイトルを取得
    if (navigationHistory.length > 0 && historyIndex >= 0) {
      const currentItem = navigationHistory[historyIndex];
      if (currentItem && currentItem.name) {
        return currentItem.name;
      }
    }

    // 履歴にタイトルがない場合はrefから取得
    switch (modal.type) {
      case 'shrine':
        return shrinePaneRef.current?.getTitle() || '';
      case 'diety':
        return dietyPaneRef.current?.getTitle() || '';
      case 'user':
        if (modal.id === currentUserId) {
          return myPageRef.current?.getTitle() || '';
        } else {
          return userPaneRef.current?.getTitle() || '';
        }
      case 'mission':
        return missionPaneRef.current?.getTitle() || `ミッション #${modal.id}`;
      case 'notification':
        return notificationPaneRef.current?.getTitle() || 'お知らせ';
      default:
        return '';
    }
  }, [modal, currentUserId, navigationHistory, historyIndex]);

  // 全体表示に戻るコールバック
  const handleBackToOverview = useCallback(() => {
    switch (modal?.type) {
      case 'shrine':
        shrinePaneRef.current?.backToOverview();
        break;
      case 'diety':
        dietyPaneRef.current?.backToOverview();
        break;
      case 'user':
        if (modal.id === currentUserId) {
          myPageRef.current?.backToOverview();
        } else {
          userPaneRef.current?.backToOverview();
        }
        break;
      case 'mission':
        missionPaneRef.current?.backToOverview();
        break;
      case 'notification':
        notificationPaneRef.current?.backToOverview();
        break;
    }
  }, [modal, currentUserId]);

  // 詳細ビュー変更時の処理
  const handleDetailViewChange = useCallback((detailView: string) => {
    const contentElement = document.querySelector('.modal__content');
    if (contentElement) {
      if (detailView === 'thumbnail') {
        contentElement.classList.add('modal__content--thumbnail-expanded');
      } else {
        contentElement.classList.remove('modal__content--thumbnail-expanded');
      }
    }
  }, []);

  return {
    modal,
    currentUserId,
    openModal: openModalWithString,
    closeModal,
    updateCurrentModalName,
    isAuthenticated,
    shrinePaneRef,
    dietyPaneRef,
    userPaneRef,
    myPageRef,
    missionPaneRef,
    notificationPaneRef,
    getModalTitle,
    handleBackToOverview,
    handleDetailViewChange
  };
};
