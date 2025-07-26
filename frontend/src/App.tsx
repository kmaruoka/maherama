import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import MapPage from './components/pages/MapPage';
import CatalogPage from './components/pages/CatalogPage';
import ShrinePane from './components/organisms/ShrinePane';
import DietyPage from './components/organisms/DietyPane';
import UserPane from './components/organisms/UserPane';
import SettingsPage from './components/pages/SettingsPage';
import MenuPane from './components/organisms/MenuPane';
import UserPage from './components/pages/UserPage';
import LogPane from './components/organisms/LogPane';
import { useSkin } from './skins/SkinContext';
import useLogs, { useClientLogs } from './hooks/useLogs';

type ModalType = { type: 'shrine' | 'diety' | 'user', id: number } | null;

function App() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [modal, setModal] = useState<ModalType>(null);
  useSkin();

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
        return <MapPage onShowShrine={(id: number) => setModal({ type: 'shrine', id })} onShowUser={(id: number) => setModal({ type: 'user', id })} />;
      case 'catalog':
        return <CatalogPage onShowShrine={(id: number) => setModal({ type: 'shrine', id })} onShowDiety={(id: number) => setModal({ type: 'diety', id })} onShowUser={(id: number) => setModal({ type: 'user', id })} />;
      case 'user':
        return <UserPage onShowShrine={(id: number) => setModal({ type: 'shrine', id })} onShowDiety={(id: number) => setModal({ type: 'diety', id })} onShowUser={(id: number) => setModal({ type: 'user', id })} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className="app__content">
        {renderPage()}
        {modal && (
          <Modal
            show={modal !== null}
            onHide={() => setModal(null)}
            centered
            dialogClassName="custom-modal-dialog"
            contentClassName="custom-modal-content-force"
          >
            <Modal.Body>
              <div className="pane__close-btn-outer">
                <Button variant="light" onClick={() => setModal(null)} className="border-0 pane__close-btn">
                  <span aria-hidden="true">×</span>
                </Button>
              </div>
              {modal.type === 'shrine' && (
                <ShrinePane
                  id={modal.id}
                  onShowDiety={id => setModal({ type: 'diety', id })}
                  onShowUser={id => setModal({ type: 'user', id })}
                />
              )}
              {modal.type === 'diety' && (
                <DietyPage
                  id={modal.id}
                  onShowShrine={id => setModal({ type: 'shrine', id })}
                  onShowUser={id => setModal({ type: 'user', id })}
                />
              )}
              {modal.type === 'user' && (
                <UserPane
                  id={modal.id}
                  onShowShrine={id => setModal({ type: 'shrine', id })}
                  onShowDiety={id => setModal({ type: 'diety', id })}
                  onShowUser={id => setModal({ type: 'user', id })}
                />
              )}
            </Modal.Body>
          </Modal>
        )}
      </div>
      <LogPane 
        logs={logs} 
        loading={logsLoading} 
        error={!!logsError} 
        onShowShrine={(id: number) => setModal({ type: 'shrine', id })} 
        onShowUser={(id: number) => setModal({ type: 'user', id })} 
        onShowDiety={(id: number) => setModal({ type: 'diety', id })} 
      />
      <MenuPane setPage={setPage} page={page} isDialogOpen={modal !== null} />
    </div>
  );
}

export default App;
