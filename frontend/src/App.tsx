import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import MapPage from './components/pages/MapPage';
import CatalogPage from './components/pages/CatalogPage';
import ShrinePage from './components/pages/ShrinePage';
import DietyPage from './components/pages/DietyPage';
import UserPage from './components/pages/UserPage';
import SettingsPage from './components/pages/SettingsPage';
import MenuPane from './components/organisms/MenuPane';

type ModalType = { type: 'shrine' | 'diety' | 'user', id: number } | null;

function App() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [modal, setModal] = useState<ModalType>(null);

  // ページ切り替え用
  const renderPage = () => {
    switch (page) {
      case 'map':
        return <MapPage onShowShrine={id => setModal({ type: 'shrine', id })} onShowUser={id => setModal({ type: 'user', id })} />;
      case 'catalog':
        return <CatalogPage onShowShrine={id => setModal({ type: 'shrine', id })} onShowDiety={id => setModal({ type: 'diety', id })} onShowUser={id => setModal({ type: 'user', id })} />;
      case 'user':
        return <UserPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <>
      <MenuPane setPage={setPage} />
      <div className="pb-5">
        {renderPage()}
        {modal && (
          <Modal show onHide={() => setModal(null)} centered size="lg">
            <Modal.Body>
              {modal.type === 'shrine' && (
                <ShrinePage
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
                <UserPage
                  id={modal.id}
                  onShowShrine={id => setModal({ type: 'shrine', id })}
                  onShowDiety={id => setModal({ type: 'diety', id })}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setModal(null)}>
                閉じる
              </Button>
            </Modal.Footer>
          </Modal>
        )}
      </div>
    </>
  );
}

export default App;
