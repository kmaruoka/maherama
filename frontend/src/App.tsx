import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapPage from './MapPage';
import ShrineListPage from './ShrineListPage';
import ShrineDetailPage from './ShrineDetailPage';
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
          <Route path="/catalog" element={<ShrineListPage />} />
          <Route path="/shrines/:id" element={<ShrineDetailPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
