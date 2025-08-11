import React from 'react';
import { Button } from 'react-bootstrap';
import { API_BASE } from '../../config/api';
import { useApiWithToast } from '../../hooks/useApiWithToast';

export const ApiTestComponent: React.FC = () => {
  const { callApi } = useApiWithToast();

  const testSuccess = async () => {
    await callApi(`${API_BASE}/test/success`);
  };

  const testError = async () => {
    await callApi(`${API_BASE}/test/error`);
  };

  const testInfo = async () => {
    await callApi(`${API_BASE}/test/info`);
  };

  const testWarning = async () => {
    await callApi(`${API_BASE}/test/warning`);
  };

  const testFatal = async () => {
    await callApi(`${API_BASE}/test/fatal`);
  };

  return (
    <div className="api-test-component">
      <h4>API & Toast 統合システム テスト</h4>
      <div className="d-flex flex-column gap-2">
        <Button onClick={testSuccess} variant="success">
          成功テスト
        </Button>
        <Button onClick={testError} variant="danger">
          エラーテスト
        </Button>
        <Button onClick={testInfo} variant="info">
          情報テスト
        </Button>
        <Button onClick={testWarning} variant="warning">
          警告テスト
        </Button>
        <Button onClick={testFatal} variant="dark">
          致命的エラーテスト
        </Button>
      </div>
    </div>
  );
};
