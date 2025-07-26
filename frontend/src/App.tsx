import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import MapPage from './components/pages/MapPage';
import CatalogPage from './components/pages/CatalogPage';
import ShrinePane from './components/organisms/ShrinePane';
import DietyPage from './components/organisms/DietyPane';
import UserPane from './components/organisms/UserPane';
import MyPage from './components/organisms/MyPage';
import type { ShrinePaneRef } from './components/organisms/ShrinePane';
import type { DietyPaneRef } from './components/organisms/DietyPane';
import type { UserPaneRef } from './components/organisms/UserPane';
import type { MyPageRef } from './components/organisms/MyPage';
import SettingsPage from './components/pages/SettingsPage';
import MenuPane from './components/organisms/MenuPane';
import UserPage from './components/pages/UserPage';
import LogPane from './components/organisms/LogPane';
import { useSkin } from './skins/SkinContext';
import useLogs, { useClientLogs } from './hooks/useLogs';
import useShrineDetail from './hooks/useShrineDetail';
import useDietyDetail from './hooks/useDietyDetail';
import useUserInfo from './hooks/useUserInfo';
import useLocalStorageState from './hooks/useLocalStorageState';
import CustomLink from './components/atoms/CustomLink';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

type ModalType = { type: 'shrine' | 'diety' | 'user', id: number } | null;

// ナビゲーション履歴の型
interface NavigationHistoryItem {
  type: 'shrine' | 'diety' | 'user';
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
  getPreviousItemType: () => 'shrine' | 'diety' | 'user';
  getNextItemType: () => 'shrine' | 'diety' | 'user';
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

function App() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [modal, setModal] = useState<ModalType>(null);
  const [currentUserId] = useLocalStorageState<number | null>('userId', null);
  useSkin();

  // ナビゲーション履歴の管理
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 各ペインコンポーネントへのref
  const shrinePaneRef = useRef<{ backToOverview: () => void }>(null);
  const dietyPaneRef = useRef<{ backToOverview: () => void }>(null);
  const userPaneRef = useRef<{ backToOverview: () => void }>(null);
  const myPageRef = useRef<{ backToOverview: () => void }>(null);

  // モーダルヘッダー用のデータ取得
  const { data: shrineData } = useShrineDetail(modal?.type === 'shrine' ? modal.id : undefined);
  const { data: dietyData } = useDietyDetail(modal?.type === 'diety' ? modal.id : undefined);
  const { data: userData } = useUserInfo(modal?.type === 'user' ? modal.id : undefined, null);

  // ナビゲーション履歴の管理関数
  const addToHistory = (type: 'shrine' | 'diety' | 'user', id: number, name: string) => {
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
  const getPreviousItemType = (): 'shrine' | 'diety' | 'user' => {
    if (historyIndex > 0) {
      return navigationHistory[historyIndex - 1].type;
    }
    return 'shrine'; // デフォルト値
  };

  // 次のアイテムタイプを取得
  const getNextItemType = (): 'shrine' | 'diety' | 'user' => {
    if (historyIndex < navigationHistory.length - 1) {
      return navigationHistory[historyIndex + 1].type;
    }
    return 'shrine'; // デフォルト値
  };

  // 履歴追加機能付きモーダル遷移
  const navigateToModal = (type: 'shrine' | 'diety' | 'user', id: number, clearHistory: boolean = false) => {
    let name = '';
    
    // 現在のデータから名前を取得
    if (type === 'shrine' && shrineData && shrineData.id === id) {
      name = shrineData.name;
    } else if (type === 'diety' && dietyData && dietyData.id === id) {
      name = dietyData.name;
    } else if (type === 'user' && userData && userData.id === id) {
      name = userData.name;
    } else {
      // データが未取得の場合は一時的な名前を設定
      name = type === 'shrine' ? '神社' : type === 'diety' ? '神様' : 'ユーザー';
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

  // データ取得後に履歴の名前を更新
  React.useEffect(() => {
    if (modal && navigationHistory.length > 0 && historyIndex >= 0) {
      let updatedName = '';
      
      if (modal.type === 'shrine' && shrineData) {
        updatedName = shrineData.name;
      } else if (modal.type === 'diety' && dietyData) {
        updatedName = dietyData.name;
      } else if (modal.type === 'user' && userData) {
        updatedName = userData.name;
      }
      
      if (updatedName && navigationHistory[historyIndex]?.name !== updatedName) {
        const updatedHistory = [...navigationHistory];
        updatedHistory[historyIndex] = { ...updatedHistory[historyIndex], name: updatedName };
        setNavigationHistory(updatedHistory);
      }
    }
  }, [shrineData, dietyData, userData, modal, navigationHistory, historyIndex]);

  // ヘッダータイトルを取得
  const getModalTitle = () => {
    if (!modal) return '';
    
    switch (modal.type) {
      case 'shrine':
        if (shrineData) {
          return shrineData.kana ? `${shrineData.name}（${shrineData.kana}）` : shrineData.name;
        }
        return '神社詳細';
      case 'diety':
        if (dietyData) {
          return dietyData.kana ? `${dietyData.name}（${dietyData.kana}）` : dietyData.name;
        }
        return '神様詳細';
      case 'user':
        if (userData) {
          return userData.name;
        }
        return 'ユーザー詳細';
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
    }
  };

  // LogPane用のlogsデータ
  const { clientLogs, addClientLog } = useClientLogs();
  const {
    data: logs = [],
    refetch: refetchLogs,
    isLoading: logsLoading,
    error: logsError,
  } = useLogs(clientLogs);

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
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className={`app__content ${modal ? 'modal-open' : ''}`}>
        {renderPage()}
        {modal && (
          <Modal
            show={modal !== null}
            onHide={closeModal}
            centered
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
                        onDetailViewChange={(detailView) => {
                          // UserPaneにはthumbnail表示がないため、何もしない
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </Modal.Body>
          </Modal>
        )}
      </div>
      <LogPane 
        logs={logs} 
        loading={logsLoading} 
        error={!!logsError} 
        onShowShrine={(id: number) => navigateToModal('shrine', id)} 
        onShowUser={(id: number) => navigateToModal('user', id)} 
        onShowDiety={(id: number) => navigateToModal('diety', id)} 
      />
      <MenuPane setPage={setPage} page={page} isDialogOpen={modal !== null} />
    </div>
  );
}

export default App;
