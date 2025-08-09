import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import useAllUsers from '../../hooks/useAllUsers';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../config/api';
import './TopPage.css';

interface TopPageProps {
  onLogin: () => void;
}

type FormType = 'register' | 'login' | 'password-reset' | 'test-user';

const TopPage: React.FC<TopPageProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [currentUserId, setCurrentUserId] = useLocalStorageState<number | null>('userId', null);
  const { data: users = [], isLoading: isLoadingUsers } = useAllUsers();
  
  // フォーム状態管理
  const [activeForm, setActiveForm] = useState<FormType | null>(null);
  
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
    // エラーとサクセスメッセージをクリア
    setRegisterErrors({});
    setLoginErrors({});
    setResetErrors({});
    setRegisterSuccess(false);
    setResetSuccess(false);
  };

  // 登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegisterErrors({});

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterErrors(data.errors || { general: data.error || '登録に失敗しました' });
      } else {
        setRegisterSuccess(true);
        setRegisterForm({ username: '', email: '' });
      }
    } catch (error) {
      setRegisterErrors({ general: 'ネットワークエラーが発生しました' });
    } finally {
      setIsRegistering(false);
    }
  };

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginErrors({});

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginErrors({ general: data.error || 'ログインに失敗しました' });
      } else {
        setCurrentUserId(data.user.id);
        localStorage.setItem('authToken', data.token);
        onLogin();
      }
    } catch (error) {
      setLoginErrors({ general: 'ネットワークエラーが発生しました' });
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
      const response = await fetch(`${API_BASE}/auth/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetErrors({ general: data.error || 'パスワードリセットに失敗しました' });
      } else {
        setResetSuccess(true);
        setResetForm({ email: '' });
      }
    } catch (error) {
      setResetErrors({ general: 'ネットワークエラーが発生しました' });
    } finally {
      setIsResetting(false);
    }
  };

  // テストユーザーログイン処理
  const handleTestUserLogin = () => {
    if (!selectedTestUserId) return;
    
    const user = users.find(u => u.id.toString() === selectedTestUserId);
    if (user) {
      setCurrentUserId(user.id);
      localStorage.setItem('authToken', 'test-token');
      onLogin();
    }
  };

  // 画像エラーハンドリング
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

      {/* 認証セクション */}
      <div className="top-page__auth-section">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} lg={6}>
              <Card className="top-page__auth-card">
                <Card.Body>
                  {/* タブボタン */}
                  <div className="top-page__auth-tabs">
                    <Button
                      variant={activeForm === 'register' ? 'primary' : 'outline-primary'}
                      onClick={() => switchForm('register')}
                      className="me-2"
                    >
                      ユーザー登録
                    </Button>
                    <Button
                      variant={activeForm === 'login' ? 'primary' : 'outline-primary'}
                      onClick={() => switchForm('login')}
                      className="me-2"
                    >
                      ログイン
                    </Button>
                    <Button
                      variant={activeForm === 'password-reset' ? 'primary' : 'outline-primary'}
                      onClick={() => switchForm('password-reset')}
                      className="me-2"
                    >
                      パスワードリセット
                    </Button>
                    <Button
                      variant={activeForm === 'test-user' ? 'primary' : 'outline-primary'}
                      onClick={() => switchForm('test-user')}
                    >
                      テストユーザー
                    </Button>
                  </div>

                  {/* ユーザー登録フォーム */}
                  {activeForm === 'register' && (
                    <div className="top-page__form-section">
                      <h4>ユーザー登録</h4>
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
                        <Button type="submit" variant="primary" disabled={isRegistering} className="w-100">
                          {isRegistering ? '登録中...' : '登録'}
                        </Button>
                      </Form>
                    </div>
                  )}

                  {/* ログインフォーム */}
                  {activeForm === 'login' && (
                    <div className="top-page__form-section">
                      <h4>ログイン</h4>
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
                        <Button type="submit" variant="primary" disabled={isLoggingIn} className="w-100">
                          {isLoggingIn ? 'ログイン中...' : 'ログイン'}
                        </Button>
                      </Form>
                    </div>
                  )}

                  {/* パスワードリセットフォーム */}
                  {activeForm === 'password-reset' && (
                    <div className="top-page__form-section">
                      <h4>パスワードリセット</h4>
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
                        <Button type="submit" variant="primary" disabled={isResetting} className="w-100">
                          {isResetting ? '送信中...' : 'パスワードリセット'}
                        </Button>
                      </Form>
                    </div>
                  )}

                  {/* テストユーザーログインフォーム */}
                  {activeForm === 'test-user' && (
                    <div className="top-page__form-section">
                      <h4>テストユーザーでログイン</h4>
                      <Form.Group className="mb-3">
                        <Form.Label>テストユーザーを選択</Form.Label>
                        {isLoadingUsers ? (
                          <div>読み込み中...</div>
                        ) : (
                          <Form.Select
                            value={selectedTestUserId}
                            onChange={(e) => setSelectedTestUserId(e.target.value)}
                          >
                            <option value="">テストユーザーを選択してください</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                ID: {user.id} - {user.name} (Lv.{user.level})
                              </option>
                            ))}
                          </Form.Select>
                        )}
                      </Form.Group>
                      <Button
                        variant="primary"
                        onClick={handleTestUserLogin}
                        disabled={!selectedTestUserId}
                        className="w-100"
                      >
                        ログイン
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default TopPage;
