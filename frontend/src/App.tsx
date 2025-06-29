import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MapPage from './MapPage';

function App() {
  return (
    <BrowserRouter>
      <nav className="p-2 bg-gray-200 flex space-x-4">
        <Link to="/">地図</Link>
      </nav>
      <Routes>
        <Route path="/" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
