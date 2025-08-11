import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Tab, Tabs } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE, apiCall, apiCallWithToast, useSecureAuth } from '../../config/api';
import useAllUsers from '../../hooks/useAllUsers';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import './TopPage.css';

interface TopPageProps {
  onLogin: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToCommercialTransaction?: () => void;
}

type FormType = 'register' | 'login' | 'test-user';

const TopPage: React.FC<TopPageProps> = ({ onLogin, onNavigateToTerms, onNavigateToCommercialTransaction }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useLocalStorageState<number | null>('userId', null);
  // テストユーザー選択機能がアクティブな場合のみuseAllUsersを呼び出す
  const { data: users = [], isLoading: isLoadingUsers } = useAllUsers();

  // フォーム状態管理
  const [activeForm, setActiveForm] = useState<FormType>('login');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // フォームデータ
  const [registerForm, setRegisterForm] = useState({ username: '', email: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetForm, setResetForm] = useState({ email: '' });
  const [selectedTestUserId, setSelectedTestUserId] = useState<string>('');

  // エラー・ローディング状態
  const [registerErrors, setRegisterErrors] = useState<{ [key: string]: string }>({});
  const [loginErrors, setLoginErrors] = useState<{ [key: string]: string }>({});
  const [resetErrors, setResetErrors] = useState<{ [key: string]: string }>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // フォーム切り替え処理
  const switchForm = (formType: FormType) => {
    setActiveForm(formType);
    setShowPasswordReset(false);
    // エラーとサクセスメッセージをクリア
    setRegisterErrors({});
    setLoginErrors({});
    setResetErrors({});
    setRegisterSuccess(false);
    setResetSuccess(false);
  };

  // パスワードリセット表示切り替え
  const togglePasswordReset = () => {
    setShowPasswordReset(!showPasswordReset);
    setResetErrors({});
    setResetSuccess(false);
  };

  // 登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegisterErrors({});

    try {
      const response = await apiCall(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(registerForm),
        requireAuth: false, // 新規登録は認証不要
      });

      const data = await response.json();

      setRegisterSuccess(true);
      setRegisterForm({ username: '', email: '' });
    } catch (error: any) {
      console.error('Registration error:', error);
      // エラーレスポンスの詳細を確認
      if (error.message && error.message.includes('API Error')) {
        try {
          const errorData = JSON.parse(error.message.split(': ')[2]);
          if (errorData.errors) {
            setRegisterErrors(errorData.errors);
          } else if (errorData.error) {
            setRegisterErrors({ general: errorData.error });
          } else {
            setRegisterErrors({ general: '登録に失敗しました' });
          }
        } catch {
          setRegisterErrors({ general: '登録に失敗しました' });
        }
      } else {
        setRegisterErrors({ general: 'ネットワークエラーが発生しました。サーバーに接続できません。' });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // セキュアな認証フックを使用
  const { login } = useSecureAuth();

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginErrors({});

    try {
      console.log('ログイン試行:', { email: loginForm.email, apiBase: API_BASE });

      const result = await apiCallWithToast(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(loginForm),
        requireAuth: false, // ログインは認証不要
      }, () => {}); // Toastは手動で制御

      if (result.success && result.data) {
        console.log('ログイン成功:', result.data);

        // セキュアな認証システムを使用
        login(result.data.token, {
          id: result.data.user.id,
          name: result.data.user.name,
          email: result.data.user.email
        });
        onLogin();
      } else {
        setLoginErrors({ general: result.message || 'ログインに失敗しました' });
      }
    } catch (error: any) {
      console.error('ログインエラー:', error);
      setLoginErrors({ general: 'ネットワークエラーが発生しました。サーバーに接続できません。' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // パスワードリセット処理
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetErrors({});

    try {
      const response = await apiCall(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ email: resetForm.email }),
        requireAuth: false, // パスワードリセットは認証不要
      });

      const data = await response.json();

      setResetSuccess(true);
      setResetForm({ email: '' });
    } catch (error) {
      setResetErrors({ general: 'パスワードリセットに失敗しました' });
    } finally {
      setIsResetting(false);
    }
  };

  // テストユーザーログイン処理
  const handleTestUserLogin = async () => {
    if (!selectedTestUserId) return;

    const user = users.find(u => u.id.toString() === selectedTestUserId);
    if (user) {
      console.log('[TopPage] テストユーザーログイン開始:', user);

      try {
        // テストユーザー用のログインAPIを呼び出してJWTトークンを取得
        const result = await apiCallWithToast(`${API_BASE}/auth/test-login`, {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
          requireAuth: false, // テストログインは認証不要
        }, () => {}); // Toastは手動で制御

        if (result.success && result.data) {
          console.log('テストログイン成功:', result.data);

          // レスポンス構造に応じて適切なプロパティにアクセス
          const userData = result.data.data?.user || result.data.user || result.data;
          const token = result.data.data?.token || result.data.token;

          if (!userData || !token) {
            console.error('[TopPage] レスポンスに必要なデータが含まれていません:', result);
            return;
          }

          // セキュアな認証システムを使用
          login(token, {
            id: userData.id,
            name: userData.name,
            email: userData.email
          });

          // currentUserIdも更新
          setCurrentUserId(userData.id);

          console.log('[TopPage] テストユーザーログイン完了:', userData.id);

          // 少し遅延してからページ遷移を実行（状態更新を待つ）
          setTimeout(() => {
            onLogin();
          }, 50);
        } else {
          console.error('[TopPage] テストログイン失敗:', result.message);
        }
      } catch (error) {
        console.error('[TopPage] テストユーザーログインエラー:', error);
      }
    }
  };

  // 画像読み込みエラー時の処理
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div className="top-page">
      {/* ヒーローセクション - キービジュアル */}
      <div className="top-page__hero">
        <img
          src="/images/jinjourney.png"
          alt="神JOURNEY"
          className="top-page__hero-image"
          onError={handleImageError}
        />
      </div>

      {/* キャッチフレーズセクション */}
      <div className="top-page__catchphrase">
        <div className="top-page__catchphrase-text">
          地図を手に、時空を巡る旅に出よう。
          <br />
          神代の物語は、まだ終わらない。
        </div>
      </div>

      {/* 認証セクション */}
      <div className="top-page__auth-section">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} lg={6}>
              <Card className="top-page__auth-card">
                <Card.Body>
                  {/* タブ */}
                  <Tabs
                    id="auth-tabs"
                    activeKey={activeForm}
                    onSelect={(k) => k && switchForm(k as FormType)}
                    className="mb-3"
                  >
                    <Tab eventKey="register" title="新規登録" />
                    <Tab eventKey="login" title="ログイン" />
                    <Tab eventKey="test-user" title="テストプレイ" />
                  </Tabs>

                  {/* 新規登録フォーム */}
                  <Tab.Pane eventKey="register" active={activeForm === 'register'}>
                    <div className="top-page__form-section">
                      {registerSuccess && (
                        <Alert variant="success">
                          登録が完了しました。確認メールをお送りしましたので、メール内のリンクをクリックしてアカウントを有効化してください。
                        </Alert>
                      )}
                      {registerErrors.general && (
                        <Alert variant="danger">{registerErrors.general}</Alert>
                      )}
                      <Form onSubmit={handleRegister}>
                        <Form.Group className="mb-3">
                          <Form.Label>ユーザー名</Form.Label>
                          <Form.Control
                            type="text"
                            value={registerForm.username}
                            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                            isInvalid={!!registerErrors.username}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {registerErrors.username}
                          </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label>メールアドレス</Form.Label>
                          <Form.Control
                            type="email"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            isInvalid={!!registerErrors.email}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {registerErrors.email}
                          </Form.Control.Feedback>
                        </Form.Group>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isRegistering || !registerForm.username || !registerForm.email}
                          className="w-100"
                        >
                          {isRegistering ? '登録中...' : '登録'}
                        </Button>
                      </Form>
                    </div>
                  </Tab.Pane>

                  {/* ログインフォーム */}
                  <Tab.Pane eventKey="login" active={activeForm === 'login'}>
                    <div className="top-page__form-section">
                      {!showPasswordReset ? (
                        <>
                          {loginErrors.general && (
                            <Alert variant="danger">{loginErrors.general}</Alert>
                          )}
                          <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3">
                              <Form.Label>メールアドレス</Form.Label>
                              <Form.Control
                                type="email"
                                value={loginForm.email}
                                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                required
                              />
                            </Form.Group>
                            <Form.Group className="mb-3">
                              <Form.Label>パスワード</Form.Label>
                              <Form.Control
                                type="password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                required
                              />
                            </Form.Group>
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={isLoggingIn || !loginForm.email || !loginForm.password}
                              className="w-100 mb-2"
                            >
                              {isLoggingIn ? 'ログイン中...' : 'ログイン'}
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              onClick={togglePasswordReset}
                              className="w-100 p-0"
                            >
                              パスワードを忘れた方はこちら
                            </Button>
                          </Form>
                        </>
                      ) : (
                        <>
                          {resetSuccess && (
                            <Alert variant="success">
                              パスワードリセット用のメールをお送りしました。メール内のリンクをクリックしてパスワードをリセットしてください。
                            </Alert>
                          )}
                          {resetErrors.general && (
                            <Alert variant="danger">{resetErrors.general}</Alert>
                          )}
                          <Form onSubmit={handlePasswordReset}>
                            <Form.Group className="mb-3">
                              <Form.Label>メールアドレス</Form.Label>
                              <Form.Control
                                type="email"
                                value={resetForm.email}
                                onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                                required
                              />
                            </Form.Group>
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={isResetting || !resetForm.email}
                              className="w-100 mb-2"
                            >
                              {isResetting ? '送信中...' : 'パスワードリセットメールを送信'}
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              onClick={togglePasswordReset}
                              className="w-100 p-0"
                            >
                              ログインに戻る
                            </Button>
                          </Form>
                        </>
                      )}
                    </div>
                  </Tab.Pane>

                  {/* テストプレイフォーム */}
                  <Tab.Pane eventKey="test-user" active={activeForm === 'test-user'}>
                    <div className="top-page__form-section">
                      <Form.Group className="mb-3">
                        {isLoadingUsers ? (
                          <div>読み込み中...</div>
                        ) : (
                          <Form.Select
                            value={selectedTestUserId}
                            onChange={(e) => setSelectedTestUserId(e.target.value)}
                          >
                            <option value="">テストユーザーを選択してください</option>
                                                          {users.map((user: any) => (
                                <option key={user.id} value={user.id}>
                                  ID: {user.id} - {user.name} (Lv.{user.level})
                                </option>
                              ))}
                          </Form.Select>
                        )}
                      </Form.Group>
                      <Button
                        variant="primary"
                        onClick={async () => await handleTestUserLogin()}
                        disabled={!selectedTestUserId}
                        className="w-100 mb-2"
                      >
                        ログイン
                      </Button>
                    </div>
                  </Tab.Pane>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

         {/* フッターリンク */}
         <div className="top-page__footer">
           <Container>
             <div className="top-page__footer-links">
               {onNavigateToTerms && (
                 <Button
                   variant="link"
                   onClick={onNavigateToTerms}
                   className="top-page__footer-link"
                 >
                   利用規約
                 </Button>
               )}
               {onNavigateToCommercialTransaction && (
                 <Button
                   variant="link"
                   onClick={onNavigateToCommercialTransaction}
                   className="top-page__footer-link"
                 >
                   特定商取引に基づく表記
                 </Button>
               )}
             </div>
           </Container>
         </div>
    </div>
  );
};

export default TopPage;
