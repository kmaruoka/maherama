import React from 'react';
import { Modal } from 'react-bootstrap';
import ModalFooter from '../molecules/ModalFooter';
import ModalHeader from '../molecules/ModalHeader';
import DietyPage from './DietyPane';
import MissionPane from './MissionPane';
import MyPage from './MyPage';
import { NotificationPane } from './NotificationPane';
import ShrinePane from './ShrinePane';
import UserPane from './UserPane';

interface ModalContentProps {
  modal: any;
  currentUserId: number | null;
  closeModal: () => void;
  getModalTitle: () => string;
  handleBackToOverview: () => void;
  handleDetailViewChange: (detailView: string) => void;
  openModal: (type: "user" | "mission" | "shrine" | "diety" | "notification", id: number, clearHistory?: boolean) => void;
  shrinePaneRef: React.RefObject<any>;
  dietyPaneRef: React.RefObject<any>;
  userPaneRef: React.RefObject<any>;
  myPageRef: React.RefObject<any>;
  missionPaneRef: React.RefObject<any>;
  notificationPaneRef: React.RefObject<any>;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  getPreviousItemName: () => string;
  getNextItemName: () => string;
  getPreviousItemType: () => 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
  getNextItemType: () => 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
}

const ModalContent: React.FC<ModalContentProps> = ({
  modal,
  currentUserId,
  closeModal,
  getModalTitle,
  handleBackToOverview,
  handleDetailViewChange,
  openModal,
  shrinePaneRef,
  dietyPaneRef,
  userPaneRef,
  myPageRef,
  missionPaneRef,
  notificationPaneRef,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  getPreviousItemName,
  getNextItemName,
  getPreviousItemType,
  getNextItemType
}) => {
  if (!modal) return null;

  const renderModalContent = () => {
    switch (modal.type) {
      case 'shrine':
        return (
          <>
            <ModalHeader
              title={getModalTitle()}
              onBack={closeModal}
              onTitleClick={handleBackToOverview}
            />
            <div className="modal__content">
              <ShrinePane
                ref={shrinePaneRef}
                id={modal.id}
                onShowDiety={(id: number) => openModal('diety', id)}
                onShowUser={(id: number) => openModal('user', id)}
                onDetailViewChange={handleDetailViewChange}
              />
            </div>
            <ModalFooter
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={goBack}
              onGoForward={goForward}
              getPreviousItemName={getPreviousItemName}
              getNextItemName={getNextItemName}
              getPreviousItemType={getPreviousItemType}
              getNextItemType={getNextItemType}
            />
          </>
        );

      case 'diety':
        return (
          <>
            <ModalHeader
              title={getModalTitle()}
              onBack={closeModal}
              onTitleClick={handleBackToOverview}
            />
            <div className="modal__content">
              <DietyPage
                ref={dietyPaneRef}
                id={modal.id}
                onShowShrine={(id: number) => openModal('shrine', id)}
                onShowUser={(id: number) => openModal('user', id)}
                onDetailViewChange={handleDetailViewChange}
              />
            </div>
            <ModalFooter
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={goBack}
              onGoForward={goForward}
              getPreviousItemName={getPreviousItemName}
              getNextItemName={getNextItemName}
              getPreviousItemType={getPreviousItemType}
              getNextItemType={getNextItemType}
            />
          </>
        );

      case 'user':
        return (
          <>
            <ModalHeader
              title={getModalTitle()}
              onBack={closeModal}
              onTitleClick={handleBackToOverview}
            />
            <div className="modal__content">
              {modal.id === currentUserId ? (
                <MyPage
                  ref={myPageRef}
                  onShowShrine={(id: number) => openModal('shrine', id)}
                  onShowDiety={(id: number) => openModal('diety', id)}
                  onShowUser={(id: number) => openModal('user', id)}
                />
              ) : (
                <UserPane
                  ref={userPaneRef}
                  id={modal.id}
                  onShowShrine={(id: number) => openModal('shrine', id)}
                  onShowDiety={(id: number) => openModal('diety', id)}
                  onShowUser={(id: number) => openModal('user', id)}
                  onDetailViewChange={handleDetailViewChange}
                />
              )}
            </div>
            <ModalFooter
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={goBack}
              onGoForward={goForward}
              getPreviousItemName={getPreviousItemName}
              getNextItemName={getNextItemName}
              getPreviousItemType={getPreviousItemType}
              getNextItemType={getNextItemType}
            />
          </>
        );

      case 'mission':
        return (
          <>
            <ModalHeader
              title={getModalTitle()}
              onBack={closeModal}
              onTitleClick={handleBackToOverview}
            />
            <MissionPane
              ref={missionPaneRef}
              id={modal.id}
              onShowShrine={(id: number) => openModal('shrine', id)}
              onShowDiety={(id: number) => openModal('diety', id)}
            />
            <ModalFooter
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={goBack}
              onGoForward={goForward}
              getPreviousItemName={getPreviousItemName}
              getNextItemName={getNextItemName}
              getPreviousItemType={getPreviousItemType}
              getNextItemType={getNextItemType}
            />
          </>
        );

      case 'notification':
        return (
          <>
            <ModalHeader
              title={getModalTitle()}
              onBack={closeModal}
              onTitleClick={handleBackToOverview}
            />
            <div className="modal__content">
              <NotificationPane
                ref={notificationPaneRef}
              />
            </div>
            <ModalFooter
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={goBack}
              onGoForward={goForward}
              getPreviousItemName={getPreviousItemName}
              getNextItemName={getNextItemName}
              getPreviousItemType={getPreviousItemType}
              getNextItemType={getNextItemType}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      show={modal !== null}
      onHide={closeModal}
      dialogClassName="custom-modal-dialog"
      contentClassName="custom-modal-content-force"
    >
      <Modal.Body style={{
        padding: 0,
        height: '600px',
        overflow: 'hidden',
        // レイアウト計算を最適化
        contain: 'layout style paint',
        willChange: 'auto'
      }}>
        {renderModalContent()}
      </Modal.Body>
    </Modal>
  );
};

export default ModalContent;
