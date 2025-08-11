import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AppMain from './components/AppMain';
import ActivatePage from './components/pages/ActivatePage';
import CommercialTransactionPage from './components/pages/CommercialTransactionPage';
import ResetPasswordPage from './components/pages/ResetPasswordPage';
import SetPasswordPage from './components/pages/SetPasswordPage';
import TermsPage from './components/pages/TermsPage';
import TopPage from './components/pages/TopPage';
import { useSecureAuth } from './config/api';
import { useSkin } from './skins/SkinContext';

function App() {
  const { isAuthenticated } = useSecureAuth();
  const [page, setPage] = useState<'map' | 'terms' | 'commercial-transaction'>('map');
  const [authStatus, setAuthStatus] = useState(false);
  useSkin();

  // 認証状態を監視
  useEffect(() => {
    const checkAuth = () => {
      const status = isAuthenticated();
      setAuthStatus(status);
    };

    // 初期チェック
    checkAuth();

    // 定期的にチェック（認証状態の変更を検知するため）
    const interval = setInterval(checkAuth, 100);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // ログイン処理
  const handleLogin = () => {
    console.log('[App] ログイン処理実行');
    setPage('map');
  };

  // ログアウト処理
  const handleLogout = () => {
    console.log('[App] ログアウト処理実行');
    setPage('map');
  };

  // 認証されていない場合のコンポーネント
  const UnauthenticatedApp = () => {
    if (page === 'terms') {
      return <TermsPage onBack={() => setPage('map')} />;
    }
    if (page === 'commercial-transaction') {
      return <CommercialTransactionPage onBack={() => setPage('map')} />;
    }
    return (
      <TopPage
        onLogin={handleLogin}
        onNavigateToTerms={() => setPage('terms')}
        onNavigateToCommercialTransaction={() => setPage('commercial-transaction')}
      />
    );
  };

  return (
    <Router>
      <Routes>
        {/* 認証不要なルート */}
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* 認証が必要なルート */}
        <Route
          path="/"
          element={
            authStatus ? (
              <AppMain onLogout={handleLogout} />
            ) : (
              <UnauthenticatedApp />
            )
          }
        />

        {/* その他のルートはリダイレクト */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
