import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useSecureAuth } from '../config/api';
import useLocalStorageState from '../hooks/useLocalStorageState';
import { useSkin } from '../skins/SkinContext';
import CustomLink from './atoms/CustomLink';
import DietyPage from './organisms/DietyPane';
import LogPane from './organisms/LogPane';
import MenuPane from './organisms/MenuPane';
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

type ModalType = { type: 'shrine' | 'diety' | 'user' | 'mission', id: number } | null;

// ナビゲーション履歴の型
interface NavigationHistoryItem {
  type: 'shrine' | 'diety' | 'user' | 'mission';
  id: number;
  name: string;
}

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
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission' | 'terms' | 'commercial-transaction'>('map');
  const [modal, setModal] = useState<ModalType>(null);
  const [currentUserId, setCurrentUserId] = useLocalStorageState<number | null>('userId', null);
  const { logout, isAuthenticated } = useSecureAuth();
  useSkin();

  // 認証状態の初期化
  useEffect(() => {
    // リロード時に認証トークンが存在する場合は認証状態を復元
    if (isAuthenticated()) {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          if (parsedUserData && parsedUserData.id && !currentUserId) {
            setCurrentUserId(parsedUserData.id);
          }
        } catch (error) {
          console.error('[AppMain] ユーザーデータの解析に失敗:', error);
        }
      }
    } else {
      // 認証されていない場合はユーザーIDもクリア
      if (currentUserId) {
        setCurrentUserId(null);
      }
    }
  }, [isAuthenticated]);

  // ナビゲーション履歴の管理
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 各ペインコンポーネントへのref
  const shrinePaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const dietyPaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const userPaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const myPageRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);
  const missionPaneRef = useRef<{ backToOverview: () => void; getTitle: () => string }>(null);

  // ログアウト処理
  const handleLogout = () => {
    // モーダルとナビゲーション履歴をクリア
    setModal(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);

    // SecureTokenManagerでログアウト処理
    logout();

    // その他のlocalStorageをクリア
    localStorage.removeItem('debugMode');
    localStorage.removeItem('maxShrineDisplay');
    localStorage.removeItem('skinName');
    localStorage.removeItem('barrierName');
    localStorage.removeItem('debugMapCenter');
    localStorage.removeItem('userId'); // 古いユーザーIDもクリア

    // ユーザーIDをクリア
    setCurrentUserId(null);

    // 親コンポーネントにログアウトを通知
    onLogout();
  };

  // ナビゲーション履歴の管理関数
  const addToHistory = (type: 'shrine' | 'diety' | 'user' | 'mission', id: number, name: string) => {
    const newItem: NavigationHistoryItem = { type, id, name };

    // 現在の位置より後の履歴を削除し、新しい項目を追加
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push(newItem);

    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prevItem = navigationHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setModal({ type: prevItem.type, id: prevItem.id });
    }
  };

  const goForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextItem = navigationHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setModal({ type: nextItem.type, id: nextItem.id });
    }
  };

  // モーダルが閉じられた時に履歴をクリア
  const closeModal = () => {
    setModal(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);
  };

  // 前のアイテム名を取得
  const getPreviousItemName = () => {
    if (historyIndex > 0) {
      return navigationHistory[historyIndex - 1].name;
    }
    return '';
  };

  // 次のアイテム名を取得
  const getNextItemName = () => {
    if (historyIndex < navigationHistory.length - 1) {
      return navigationHistory[historyIndex + 1].name;
    }
    return '';
  };

  // 前のアイテムタイプを取得
  const getPreviousItemType = (): 'shrine' | 'diety' | 'user' | 'mission' => {
    if (historyIndex > 0) {
      return navigationHistory[historyIndex - 1].type;
    }
    return 'shrine'; // デフォルト値
  };

  // 次のアイテムタイプを取得
  const getNextItemType = (): 'shrine' | 'diety' | 'user' | 'mission' => {
    if (historyIndex < navigationHistory.length - 1) {
      return navigationHistory[historyIndex + 1].type;
    }
    return 'shrine'; // デフォルト値
  };

  // 履歴追加機能付きモーダル遷移
  const navigateToModal = (type: 'shrine' | 'diety' | 'user' | 'mission', id: number, clearHistory: boolean = false) => {
    let name = '';

    // 現在のデータから名前を取得
    if (type === 'shrine') {
      name = '神社';
    } else if (type === 'diety') {
      name = '神様';
    } else if (type === 'user') {
      name = 'ユーザー';
    } else if (type === 'mission') {
      name = `ミッション #${id}`;
    } else {
      // データが未取得の場合は一時的な名前を設定
      name = type === 'shrine' ? '神社' : type === 'diety' ? '神様' : type === 'user' ? 'ユーザー' : 'ミッション';
    }

    if (clearHistory) {
      // 履歴をクリアして新しい項目を追加
      setNavigationHistory([{ type, id, name }]);
      setHistoryIndex(0);
    } else {
      // 同じアイテムが既に現在の位置にある場合は履歴を追加しない
      const currentItem = navigationHistory[historyIndex];
      if (currentItem && currentItem.type === type && currentItem.id === id) {
        setModal({ type, id });
        return;
      }

      addToHistory(type, id, name);
    }

    setModal({ type, id });
  };

  // モーダルタイトルを取得
  const getModalTitle = () => {
    if (!modal) return '';

    switch (modal.type) {
      case 'shrine':
        return shrinePaneRef.current?.getTitle() || '神社';
      case 'diety':
        return dietyPaneRef.current?.getTitle() || '神様';
      case 'user':
        if (modal.id === currentUserId) {
          return myPageRef.current?.getTitle() || 'マイページ';
        } else {
          return userPaneRef.current?.getTitle() || 'ユーザー';
        }
      case 'mission':
        return `ミッション #${modal.id}`;
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
        // 自分かどうかで分岐
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
        return <MapPage onShowShrine={(id: number) => navigateToModal('shrine', id)} onShowUser={(id: number) => navigateToModal('user', id)} />;
      case 'catalog':
        return <CatalogPage onShowShrine={(id: number) => navigateToModal('shrine', id)} onShowDiety={(id: number) => navigateToModal('diety', id)} onShowUser={(id: number) => navigateToModal('user', id)} />;
      case 'user':
        return <UserPage onShowShrine={(id: number) => navigateToModal('shrine', id)} onShowDiety={(id: number) => navigateToModal('diety', id)} onShowUser={(id: number) => navigateToModal('user', id)} />;
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
        return <MissionPage onShowShrine={(id: number) => navigateToModal('shrine', id)} onShowDiety={(id: number) => navigateToModal('diety', id)} onShowMission={(id: number) => navigateToModal('mission', id)} />;
      case 'terms':
        return <TermsPage />;
      case 'commercial-transaction':
        return <CommercialTransactionPage />;
      default:
        return null;
    }
  };

  // データ取得後に履歴の名前を更新
  React.useEffect(() => {
    if (modal && navigationHistory.length > 0 && historyIndex >= 0) {
      let updatedName = '';

      if (modal.type === 'shrine') {
        updatedName = shrinePaneRef.current?.getTitle() || '神社';
      } else if (modal.type === 'diety') {
        updatedName = dietyPaneRef.current?.getTitle() || '神様';
      } else if (modal.type === 'user') {
        if (modal.id === currentUserId) {
          updatedName = myPageRef.current?.getTitle() || 'マイページ';
        } else {
          updatedName = userPaneRef.current?.getTitle() || 'ユーザー';
        }
      } else if (modal.type === 'mission') {
        updatedName = `ミッション #${modal.id}`;
      }

      if (updatedName && navigationHistory[historyIndex]?.name !== updatedName) {
        const updatedHistory = [...navigationHistory];
        updatedHistory[historyIndex] = { ...updatedHistory[historyIndex], name: updatedName };
        setNavigationHistory(updatedHistory);
      }
    }
  }, [modal, navigationHistory, historyIndex, currentUserId]);

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
                    canGoBack={historyIndex > 0}
                    canGoForward={historyIndex < navigationHistory.length - 1}
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
                      onShowDiety={id => navigateToModal('diety', id)}
                      onShowUser={id => navigateToModal('user', id)}
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
                    canGoBack={historyIndex > 0}
                    canGoForward={historyIndex < navigationHistory.length - 1}
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
                      onShowShrine={id => navigateToModal('shrine', id)}
                      onShowUser={id => navigateToModal('user', id)}
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
                    canGoBack={historyIndex > 0}
                    canGoForward={historyIndex < navigationHistory.length - 1}
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
                        onShowShrine={id => navigateToModal('shrine', id)}
                        onShowDiety={id => navigateToModal('diety', id)}
                        onShowUser={id => navigateToModal('user', id)}
                      />
                    ) : (
                      <UserPane
                        ref={userPaneRef}
                        id={modal.id}
                        onShowShrine={id => navigateToModal('shrine', id)}
                        onShowDiety={id => navigateToModal('diety', id)}
                        onShowUser={id => navigateToModal('user', id)}
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
                    canGoBack={historyIndex > 0}
                    canGoForward={historyIndex < navigationHistory.length - 1}
                    onGoBack={goBack}
                    onGoForward={goForward}
                    getPreviousItemName={getPreviousItemName}
                    getNextItemName={getNextItemName}
                    getPreviousItemType={getPreviousItemType}
                    getNextItemType={getNextItemType}
                  />
                  <div className="modal__content">
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      ミッション情報はMissionPageで確認してください
                    </div>
                  </div>
                </>
              )}
            </Modal.Body>
          </Modal>
        )}
      </div>
      <LogPane
        onShowShrine={(id: number) => navigateToModal('shrine', id)}
        onShowDiety={(id: number) => navigateToModal('diety', id)}
        onShowUser={(id: number) => navigateToModal('user', id)}
      />
      <MenuPane setPage={setPage} page={page} isDialogOpen={modal !== null} />
    </div>
  );
};

export default AppMain;
