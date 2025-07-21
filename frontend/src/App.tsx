import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import MapPage from './components/pages/MapPage';
import CatalogPage from './components/pages/CatalogPage';
import ShrinePane from './components/organisms/ShrinePane';
import DietyPage from './components/organisms/DietyPane';
import UserPage from './components/pages/UserPage';
import SettingsPage from './components/pages/SettingsPage';
import MenuPane from './components/organisms/MenuPane';
import { useSkin } from './skins/SkinContext';

type ModalType = { type: 'shrine' | 'diety' | 'user', id: number } | null;

function App() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [modal, setModal] = useState<ModalType>(null);
  useSkin();

  // 地図ページだけbodyにno-skin-paddingクラスを付与
  useEffect(() => {
    if (page === 'map') {
      document.body.classList.add('no-skin-padding');
    } else {
      document.body.classList.remove('no-skin-padding');
    }
  }, [page]);

  // ページ切り替え用
  const renderPage = () => {
    switch (page) {
      case 'map':
        return <MapPage onShowShrine={id => setModal({ type: 'shrine', id })} onShowUser={id => setModal({ type: 'user', id })} />;
      case 'catalog':
        return <CatalogPage onShowShrine={id => setModal({ type: 'shrine', id })} onShowDiety={id => setModal({ type: 'diety', id })} onShowUser={id => setModal({ type: 'user', id })} />;
      case 'user':
        return <UserPage onShowShrine={id => setModal({ type: 'shrine', id })} onShowDiety={id => setModal({ type: 'diety', id })} onShowUser={id => setModal({ type: 'user', id })} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className={page === 'map' ? 'flex-grow-1' : 'overflow-y-auto pb-56 position-relative flex-grow-1'}>
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
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1 }}>
                <Button variant="light" onClick={() => setModal(null)} className="border-0 custom-close-btn">
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
                <UserPage
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
      <MenuPane setPage={setPage} page={page} isDialogOpen={modal !== null} />
    </div>
  );
}

export default App;
