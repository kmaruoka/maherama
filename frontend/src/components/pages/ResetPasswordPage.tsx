import { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Form, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE, apiCall } from '../../config/api';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useSkin } from '../../skins/SkinContext';
import './CommonPage.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useSkin();

  // React Routerのページ遷移時にスクロール位置をリセット
  useScrollToTop();

  useEffect(() => {
    const tokenParam = searchParams.get('token');

    if (!tokenParam) {
      setStatus('error');
      setMessage('無効なリンクです。');
      return;
    }

    setToken(tokenParam);
    setStatus('form');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // バリデーション
    if (formData.password.length < 6) {
      setErrors({ password: 'パスワードは6文字以上で入力してください。' });
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'パスワードが一致しません。' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiCall(`${API_BASE}/auth/reset-password-confirm`, {
        method: 'POST',
        body: JSON.stringify({
          token,
          password: formData.password
        }),
        requireAuth: false, // パスワードリセットは認証不要
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setErrors({ general: data.error || 'パスワードリセットに失敗しました。' });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setErrors({ general: 'ネットワークエラーが発生しました。' });
    } finally {
      setIsSubmitting(false);
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
            <h1 className="common-page__title">パスワードリセット</h1>

            <div className="common-page__section">
              {status === 'loading' && (
                <div className="text-center">
                  <Spinner animation="border" role="status" className="mb-3">
                    <span className="visually-hidden">読み込み中...</span>
                  </Spinner>
                  <p>リンクを確認しています...</p>
                </div>
              )}

              {status === 'form' && (
                <>
                  {errors.general && (
                    <Alert variant="danger">{errors.general}</Alert>
                  )}
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>新しいパスワード</Form.Label>
                      <Form.Control
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        isInvalid={!!errors.password}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password}
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>パスワード確認</Form.Label>
                      <Form.Control
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        isInvalid={!!errors.confirmPassword}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.confirmPassword}
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting || !formData.password || !formData.confirmPassword}
                      className="w-100 mb-2"
                    >
                      {isSubmitting ? '更新中...' : 'パスワードを更新'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={handleBackToLogin}
                      className="w-100"
                    >
                      ログインページに戻る
                    </Button>
                  </Form>
                </>
              )}

              {status === 'success' && (
                <Alert variant="success">
                  <Alert.Heading>パスワード更新完了</Alert.Heading>
                  <p>{message}</p>
                  <hr />
                  <Button variant="primary" onClick={handleBackToLogin}>
                    ログインページに戻る
                  </Button>
                </Alert>
              )}

              {status === 'error' && (
                <Alert variant="danger">
                  <Alert.Heading>エラー</Alert.Heading>
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
