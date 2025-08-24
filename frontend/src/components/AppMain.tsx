import React, { useEffect, useState } from 'react';
import { useModal } from '../contexts/ModalContext';
import { useAuthInitialization } from '../hooks/useAuthInitialization';
import { useLogoutHandler } from '../hooks/useLogoutHandler';
import { useModalDisplay } from '../hooks/useModalDisplay';
import { useNotificationModalListener } from '../hooks/useNotificationModalListener';
import { useSkin } from '../skins/SkinContext';
import LogPane from './organisms/LogPane';
import MenuPane from './organisms/MenuPane';
import ModalContent from './organisms/ModalContent';
import PageContent from './organisms/PageContent';

interface AppMainProps {
  onLogout: () => void;
}

const AppMain: React.FC<AppMainProps> = ({ onLogout }) => {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission' | 'terms' | 'commercial-transaction'>('map');

  // 認証された状態でのページ遷移時にスクロール位置をリセット
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const {
    modal,
    currentUserId,
    openModal,
    closeModal,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    getPreviousItemName,
    getNextItemName,
    getPreviousItemType,
    getNextItemType,
    updateCurrentModalName,
    setCurrentUserId
  } = useModal();

  useSkin();
  useAuthInitialization();
  useNotificationModalListener(openModal);

  const {
    shrinePaneRef,
    dietyPaneRef,
    userPaneRef,
    myPageRef,
    missionPaneRef,
    notificationPaneRef,
    getModalTitle,
    handleBackToOverview,
    handleDetailViewChange
  } = useModalDisplay();

  const { handleLogout } = useLogoutHandler(onLogout);

  const handleNavigateToTerms = () => setPage('terms');
  const handleNavigateToCommercialTransaction = () => setPage('commercial-transaction');
  const handleBack = () => setPage('submenu');

  return (
    <div className="app">
      <div className={`app__content ${modal ? 'modal-open' : ''}`}>
        <div className="app__header">
        </div>
        <PageContent
          page={page}
          openModal={openModal}
          onNavigateToTerms={handleNavigateToTerms}
          onNavigateToCommercialTransaction={handleNavigateToCommercialTransaction}
          onLogout={handleLogout}
          onBack={handleBack}
        />
        <ModalContent
          modal={modal}
          currentUserId={currentUserId}
          closeModal={closeModal}
          getModalTitle={getModalTitle}
          handleBackToOverview={handleBackToOverview}
          handleDetailViewChange={handleDetailViewChange}
          openModal={openModal}
          shrinePaneRef={shrinePaneRef}
          dietyPaneRef={dietyPaneRef}
          userPaneRef={userPaneRef}
          myPageRef={myPageRef}
          missionPaneRef={missionPaneRef}
          notificationPaneRef={notificationPaneRef}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          goBack={goBack}
          goForward={goForward}
          getPreviousItemName={getPreviousItemName}
          getNextItemName={getNextItemName}
          getPreviousItemType={getPreviousItemType}
          getNextItemType={getNextItemType}
        />
      </div>
      <LogPane
        onShowShrine={(id: number) => openModal('shrine', id)}
        onShowDiety={(id: number) => openModal('diety', id)}
        onShowUser={(id: number) => openModal('user', id)}
      />
      <MenuPane setPage={setPage} page={page} isDialogOpen={modal !== null} />
    </div>
  );
};

export default AppMain;
