import React, { useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useSecureAuth } from '../config/api';
import { useModal } from '../contexts/ModalContext';
import { useSkin } from '../skins/SkinContext';
import CustomLink from './atoms/CustomLink';
import DietyPage from './organisms/DietyPane';
import LogPane from './organisms/LogPane';
import MenuPane from './organisms/MenuPane';
import MissionPane from './organisms/MissionPane';
import MyPage from './organisms/MyPage';
import ShrinePane from './organisms/ShrinePane';
import UserPane from './organisms/UserPane';
import CatalogPage from './pages/CatalogPage';
import CommercialTransactionPage from './pages/CommercialTransactionPage';
import MapPage from './pages/MapPage';
import MissionPage from './pages/MissionPage';
import SettingsPage from './pages/SettingsPage';
import SubmenuPage from './pages/SubmenuPage';
import TermsPage from './pages/TermsPage';
import UserPage from './pages/UserPage';

// モーダルヘッダーコンポーネント
function ModalHeader({
  title,
  onBack,
  onTitleClick,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  getPreviousItemName,
  getNextItemName,
  getPreviousItemType,
  getNextItemType
}: {
  title: string;
  onBack: () => void;
  onTitleClick?: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  getPreviousItemName: () => string;
  getNextItemName: () => string;
  getPreviousItemType: () => 'shrine' | 'diety' | 'user' | 'mission';
  getNextItemType: () => 'shrine' | 'diety' | 'user' | 'mission';
}) {
  return (
    <div className="modal__header">
      <div className="modal__header-content">
        <h3
          onClick={onTitleClick}
          style={{ cursor: onTitleClick ? 'pointer' : 'default' }}
          className={onTitleClick ? 'modal__header-title--clickable' : ''}
        >
          {title}
        </h3>
        <div className="modal__navigation">
          <div className="modal__navigation-left">
            {canGoBack && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                <FaArrowLeft size={12} />
                <CustomLink
                  onClick={onGoBack}
                  type={getPreviousItemType()}
                >
                  {getPreviousItemName()}
                </CustomLink>
              </div>
            )}
          </div>
          <div className="modal__navigation-right">
            {canGoForward && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                <CustomLink
                  onClick={onGoForward}
                  type={getNextItemType()}
                >
                  {getNextItemName()}
                </CustomLink>
                <FaArrowRight size={12} />
              </div>
            )}
          </div>
        </div>
      </div>
      <button className="btn-base pane__close-btn" onClick={onBack}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

interface AppMainProps {
  onLogout: () => void;
}

const AppMain: React.FC<AppMainProps> = ({ onLogout }) => {
  const [page, setPage] = React.useState<'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission' | 'terms' | 'commercial-transaction'>('map');
  const { logout, isAuthenticated } = useSecureAuth();
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

  // 認証状態の初期化
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

  // 各ペインコンポーネントへのref
  const shrinePaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const dietyPaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const userPaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const myPageRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const missionPaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);

  // ログアウト処理
  const handleLogout = () => {
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
  };

  // モーダルタイトルを取得
  const getModalTitle = () => {
    if (!modal) return '';

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
      default:
        return '';
    }
  };

  // 全体表示に戻るコールバック
  const handleBackToOverview = () => {
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
    }
  };

  // ページ切り替え用
  const renderPage = () => {
    switch (page) {
      case 'map':
        return <MapPage onShowShrine={(id: number) => openModal('shrine', id)} onShowUser={(id: number) => openModal('user', id)} />;
      case 'catalog':
        return <CatalogPage onShowShrine={(id: number) => openModal('shrine', id)} onShowDiety={(id: number) => openModal('diety', id)} onShowUser={(id: number) => openModal('user', id)} />;
      case 'user':
        return <UserPage onShowShrine={(id: number) => openModal('shrine', id)} onShowDiety={(id: number) => openModal('diety', id)} onShowUser={(id: number) => openModal('user', id)} />;
      case 'settings':
        return <SettingsPage onLogout={handleLogout} />;
      case 'submenu':
        return (
          <SubmenuPage
            onNavigateToTerms={() => setPage('terms')}
            onNavigateToCommercialTransaction={() => setPage('commercial-transaction')}
          />
        );
      case 'mission':
        return <MissionPage onShowShrine={(id: number) => openModal('shrine', id)} onShowDiety={(id: number) => openModal('diety', id)} onShowMission={(id: number) => openModal('mission', id)} />;
      case 'terms':
        return <TermsPage />;
      case 'commercial-transaction':
        return <CommercialTransactionPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className={`app__content ${modal ? 'modal-open' : ''}`}>
        {renderPage()}
        {modal && currentUserId && (
          <Modal
            show={modal !== null}
            onHide={closeModal}
            dialogClassName="custom-modal-dialog"
            contentClassName="custom-modal-content-force"
          >
            <Modal.Body style={{ padding: 0, height: 'auto', overflow: 'hidden' }}>
              {modal.type === 'shrine' && (
                <>
                  <ModalHeader
                    title={getModalTitle()}
                    onBack={closeModal}
                    onTitleClick={handleBackToOverview}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={goBack}
                    onGoForward={goForward}
                    getPreviousItemName={getPreviousItemName}
                    getNextItemName={getNextItemName}
                    getPreviousItemType={getPreviousItemType}
                    getNextItemType={getNextItemType}
                  />
                  <div className="modal__content">
                    <ShrinePane
                      ref={shrinePaneRef}
                      id={modal.id}
                      onShowDiety={(id: number) => openModal('diety', id)}
                      onShowUser={(id: number) => openModal('user', id)}
                      onDataLoaded={updateCurrentModalName}
                      onDetailViewChange={(detailView) => {
                        const contentElement = document.querySelector('.modal__content');
                        if (contentElement) {
                          if (detailView === 'thumbnail') {
                            contentElement.classList.add('modal__content--thumbnail-expanded');
                          } else {
                            contentElement.classList.remove('modal__content--thumbnail-expanded');
                          }
                        }
                      }}
                    />
                  </div>
                </>
              )}
              {modal.type === 'diety' && (
                <>
                  <ModalHeader
                    title={getModalTitle()}
                    onBack={closeModal}
                    onTitleClick={handleBackToOverview}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={goBack}
                    onGoForward={goForward}
                    getPreviousItemName={getPreviousItemName}
                    getNextItemName={getNextItemName}
                    getPreviousItemType={getPreviousItemType}
                    getNextItemType={getNextItemType}
                  />
                  <div className="modal__content">
                    <DietyPage
                      ref={dietyPaneRef}
                      id={modal.id}
                      onShowShrine={(id: number) => openModal('shrine', id)}
                      onShowUser={(id: number) => openModal('user', id)}
                      onDataLoaded={updateCurrentModalName}
                      onDetailViewChange={(detailView) => {
                        const contentElement = document.querySelector('.modal__content');
                        if (contentElement) {
                          if (detailView === 'thumbnail') {
                            contentElement.classList.add('modal__content--thumbnail-expanded');
                          } else {
                            contentElement.classList.remove('modal__content--thumbnail-expanded');
                          }
                        }
                      }}
                    />
                  </div>
                </>
              )}
              {modal.type === 'user' && (
                <>
                  <ModalHeader
                    title={getModalTitle()}
                    onBack={closeModal}
                    onTitleClick={handleBackToOverview}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={goBack}
                    onGoForward={goForward}
                    getPreviousItemName={getPreviousItemName}
                    getNextItemName={getNextItemName}
                    getPreviousItemType={getPreviousItemType}
                    getNextItemType={getNextItemType}
                  />
                  <div className="modal__content">
                    {modal.id === currentUserId ? (
                      <MyPage
                        ref={myPageRef}
                        onShowShrine={(id: number) => openModal('shrine', id)}
                        onShowDiety={(id: number) => openModal('diety', id)}
                        onShowUser={(id: number) => openModal('user', id)}
                        onDataLoaded={updateCurrentModalName}
                      />
                    ) : (
                      <UserPane
                        ref={userPaneRef}
                        id={modal.id}
                        onShowShrine={(id: number) => openModal('shrine', id)}
                        onShowDiety={(id: number) => openModal('diety', id)}
                        onShowUser={(id: number) => openModal('user', id)}
                        onDataLoaded={updateCurrentModalName}
                      />
                    )}
                  </div>
                </>
              )}
              {modal.type === 'mission' && (
                <>
                  <ModalHeader
                    title={getModalTitle()}
                    onBack={closeModal}
                    onTitleClick={handleBackToOverview}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={goBack}
                    onGoForward={goForward}
                    getPreviousItemName={getPreviousItemName}
                    getNextItemName={getNextItemName}
                    getPreviousItemType={getPreviousItemType}
                    getNextItemType={getNextItemType}
                  />
                  <MissionPane
                    ref={missionPaneRef}
                    id={modal.id}
                    onShowShrine={(id: number) => openModal('shrine', id)}
                    onShowDiety={(id: number) => openModal('diety', id)}
                    onDataLoaded={updateCurrentModalName}
                  />
                </>
              )}
            </Modal.Body>
          </Modal>
        )}
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
