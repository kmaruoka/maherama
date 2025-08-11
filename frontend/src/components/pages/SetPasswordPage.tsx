import { useState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, apiCall } from '../../config/api';
import { useSkin } from '../../skins/SkinContext';
import './CommonPage.css';

export default function SetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  useSkin();

  const token = location.state?.token;
  const welcomeMessage = location.state?.message || 'パスワードを設定してください。';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setStatus('error');
      setMessage('無効なアクセスです。');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setMessage('パスワードは6文字以上で入力してください。');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('パスワードが一致しません。');
      return;
    }

    setStatus('loading');

    try {
      const response = await apiCall(`${API_BASE}/auth/set-password`, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        requireAuth: false, // パスワード設定は認証不要
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        // 成功後、ログインページに遷移
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'パスワード設定に失敗しました。');
      }
    } catch (error) {
      console.error('Set password error:', error);
      setStatus('error');
      setMessage('ネットワークエラーが発生しました。');
    }
  };

  const handleBackToLogin = () => {
    navigate('/');
  };

  return (
    <div className="common-page">
      <Container>
        <Card className="common-page__card">
          <Card.Body className="common-page__content">
            <h1 className="common-page__title">パスワード設定</h1>

            <div className="common-page__section">
              {!token && (
                <Alert variant="danger">
                  <Alert.Heading>エラー</Alert.Heading>
                  <p>無効なアクセスです。</p>
                  <hr />
                  <Button variant="primary" onClick={handleBackToLogin}>
                    ログインページに戻る
                  </Button>
                </Alert>
              )}

              {token && status === 'idle' && (
                <>
                  <Alert variant="info">
                    <p>{welcomeMessage}</p>
                  </Alert>

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>パスワード</Form.Label>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="パスワードを入力してください（6文字以上）"
                        required
                        minLength={6}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>パスワード確認</Form.Label>
                      <Form.Control
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="パスワードを再入力してください"
                        required
                      />
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button variant="primary" type="submit">
                        パスワードを設定
                      </Button>
                      <Button variant="outline-secondary" onClick={handleBackToLogin}>
                        ログインページに戻る
                      </Button>
                    </div>
                  </Form>
                </>
              )}

              {status === 'loading' && (
                <div className="text-center">
                  <Alert variant="info">
                    <p>パスワードを設定しています...</p>
                  </Alert>
                </div>
              )}

              {status === 'success' && (
                <Alert variant="success">
                  <Alert.Heading>設定完了</Alert.Heading>
                  <p>{message}</p>
                  <p>ログインページに移動します...</p>
                </Alert>
              )}

              {status === 'error' && (
                <Alert variant="danger">
                  <Alert.Heading>エラー</Alert.Heading>
                  <p>{message}</p>
                  <hr />
                  <Button variant="primary" onClick={() => setStatus('idle')}>
                    再試行
                  </Button>
                  <Button variant="outline-secondary" onClick={handleBackToLogin} className="ms-2">
                    ログインページに戻る
                  </Button>
                </Alert>
              )}
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
