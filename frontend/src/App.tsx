import { useState } from 'react';
import MapPage from './MapPage';
import CatalogPage from './CatalogPage';
import ShrinePage from './ShrinePage';
import DietyPage from './DietyPage';
import UserPage from './UserPage';
import SettingsPage from './SettingsPage';
import MenuPane from './components/organisms/MenuPane';

type ModalType = { type: 'shrine' | 'diety', id: number } | null;

function App() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [modal, setModal] = useState<ModalType>(null);

  // ページ切り替え用
  const renderPage = () => {
    switch (page) {
      case 'map':
        return <MapPage onShowShrine={id => setModal({ type: 'shrine', id })} />;
      case 'catalog':
        return <CatalogPage onShowShrine={id => setModal({ type: 'shrine', id })} onShowDiety={id => setModal({ type: 'diety', id })} />;
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
      <div className="pb-12">
        {renderPage()}
        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setModal(null)}>
            <div className="bg-white p-4 rounded shadow-lg min-w-[300px] max-w-lg" onClick={e => e.stopPropagation()}>
              {modal.type === 'shrine' && <ShrinePage id={modal.id} />}
              {modal.type === 'diety' && <DietyPage id={modal.id} />}
              <button className="mt-4 px-2 py-1 bg-gray-400 text-white rounded" onClick={() => setModal(null)}>閉じる</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
