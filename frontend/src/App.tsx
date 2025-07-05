import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import MapPage from './components/pages/MapPage';
import CatalogPage from './components/pages/CatalogPage';
import ShrinePage from './components/pages/ShrinePage';
import DietyPage from './components/pages/DietyPage';
import UserPage from './components/pages/UserPage';
import SettingsPage from './components/pages/SettingsPage';
import MenuPane from './components/organisms/MenuPane';
import { useSkin } from './skins/SkinContext';

type ModalType = { type: 'shrine' | 'diety' | 'user', id: number } | null;

function App() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [modal, setModal] = useState<ModalType>(null);
  const { skin } = useSkin();

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
          <Modal
            show={modal !== null}
            onHide={() => setModal(null)}
            centered
            contentClassName={undefined}
          >
            <Modal.Body style={{
              position: 'relative',
              border: `3px solid ${skin.colors.border}`,
              boxShadow: skin.boxShadow,
              borderRadius: skin.borderRadius,
              background: skin.modal.background,
              padding: skin.modal.padding,
              maxWidth: skin.modal.maxWidth,
              margin: '0 auto',
              fontFamily: skin.fontFamily,
            }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1 }}>
                <Button variant="light" onClick={() => setModal(null)} className="border-0">
                  <span aria-hidden="true">×</span>
                </Button>
              </div>
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
          </Modal>
        )}
      </div>
    </>
  );
}

export default App;
