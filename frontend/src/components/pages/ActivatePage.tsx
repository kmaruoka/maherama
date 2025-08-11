import { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE, apiCall } from '../../config/api';
import { useSkin } from '../../skins/SkinContext';
import './CommonPage.css';

export default function ActivatePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  useSkin();

  useEffect(() => {
    const activateAccount = async () => {
      const token = searchParams.get('token');
      console.log('[ActivatePage] Token:', token);
      console.log('[ActivatePage] API_BASE:', API_BASE);

      if (!token) {
        setStatus('error');
        setMessage('無効なリンクです。');
        return;
      }

      try {
        console.log('[ActivatePage] Sending activation request...');
        const response = await apiCall(`${API_BASE}/auth/activate`, {
          method: 'POST',
          body: JSON.stringify({ token }),
          requireAuth: false, // アカウント有効化は認証不要
        });

        console.log('[ActivatePage] Response status:', response.status);
        const data = await response.json();
        console.log('[ActivatePage] Response data:', data);

        if (data.success) {
          setStatus('success');
          setMessage(data.message);
          // アクティベーション成功後、パスワード設定ページに遷移
          setTimeout(() => {
            navigate('/set-password', {
              state: {
                message: 'アカウントが有効化されました。パスワードを設定してください。',
                token: token
              }
            });
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'アカウント有効化に失敗しました。');
        }
      } catch (error) {
        console.error('[ActivatePage] Activation error:', error);
        setStatus('error');
        setMessage('ネットワークエラーが発生しました。');
      }
    };

    activateAccount();
  }, [searchParams, navigate]);

  const handleBackToLogin = () => {
    navigate('/');
  };

  return (
    <div className="common-page">
      <Container>
        <Card className="common-page__card">
          <Card.Body className="common-page__content">
            <h1 className="common-page__title">アカウント有効化</h1>

            <div className="common-page__section">
              {status === 'loading' && (
                <div className="text-center">
                  <Spinner animation="border" role="status" className="mb-3">
                    <span className="visually-hidden">読み込み中...</span>
                  </Spinner>
                  <p>アカウントを有効化しています...</p>
                </div>
              )}

              {status === 'success' && (
                <Alert variant="success">
                  <Alert.Heading>有効化完了</Alert.Heading>
                  <p>{message}</p>
                  <p>パスワード設定ページに移動します...</p>
                </Alert>
              )}

              {status === 'error' && (
                <Alert variant="danger">
                  <Alert.Heading>有効化エラー</Alert.Heading>
                  <p>{message}</p>
                  <hr />
                  <Button variant="primary" onClick={handleBackToLogin}>
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
