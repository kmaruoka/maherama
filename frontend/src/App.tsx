import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import MapPage from './MapPage';
import CatalogPage from './CatalogPage';
import ShrinePage from './ShrinePage';
import DietyPage from './DietyPage';
import UserPage from './UserPage';
import SettingsPage from './SettingsPage';
import MenuPane from './components/organisms/MenuPane';

function AppRoutes() {
  const [page, setPage] = useState<'map' | 'catalog' | 'user' | 'settings'>('map');
  const [shrineId, setShrineId] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <>
      <MenuPane setPage={setPage} />
      <div className="pb-12">
        <Routes>
          <Route path="/" element={<MapPage onShowShrine={(id) => navigate(`/shrines/${id}`)} />} />
          <Route path="/catalog" element={<CatalogPage onShowShrine={(id) => navigate(`/shrines/${id}`)} onShowDiety={(id) => navigate(`/dieties/${id}`)} />} />
          <Route path="/shrines/:id" element={<ShrinePageWrapper />} />
          <Route path="/dieties/:id" element={<DietyPageWrapper />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </>
  );
}

function ShrinePageWrapper() {
  const { id } = useParams();
  return <ShrinePage id={Number(id)} />;
}
function DietyPageWrapper() {
  const { id } = useParams();
  return <DietyPage id={Number(id)} />;
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
