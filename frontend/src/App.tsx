import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapPage from './MapPage';
import CatalogPage from './CatalogPage';
import ShrinePage from './ShrinePage';
import DietyPage from './DietyPage';
import UserPage from './UserPage';
import SettingsPage from './SettingsPage';
import MenuPane from './components/organisms/MenuPane';

function App() {
  return (
    <BrowserRouter>
      <MenuPane />
      <div className="pb-12">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/shrines/:id" element={<ShrinePage />} />
          <Route path="/dieties/:id" element={<DietyPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
