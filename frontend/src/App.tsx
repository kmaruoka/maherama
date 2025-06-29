import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MapPage from './MapPage';
import ShrineListPage from './ShrineListPage';
import ShrineDetailPage from './ShrineDetailPage';
import UserPage from './UserPage';
import SettingsPage from './SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <nav className="p-2 bg-gray-200 flex space-x-4 fixed bottom-0 left-0 right-0 justify-around">
        <Link to="/">地図</Link>
        <Link to="/catalog">図鑑</Link>
        <Link to="/user">ユーザー</Link>
        <Link to="/settings">設定</Link>
      </nav>
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
