import React, { useState } from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';

export default function SettingsPage() {
  const [name, setName] = useLocalStorageState('userName', '');
  const [userId, setUserId] = useLocalStorageState<number | null>('userId', null);
  const [input, setInput] = useState('');
  const [idInput, setIdInput] = useState('');
  const [debugMode, setDebugMode] = useLocalStorageState('debugMode', false);

  const handleLogin = () => {
    if (input.trim() && idInput.trim()) {
      setName(input.trim());
      setUserId(Number(idInput));
      setInput('');
      setIdInput('');
    }
  };

  const handleLogout = () => {
    setName('');
    setUserId(null);
  };

  const toggleDebugMode = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
  };

  if (!name) {
    return (
      <div className="p-3">
        <h2 className="h5 fw-bold mb-3">ログイン</h2>
        <div>ユーザー名を入力してください</div>
        <input
          type="text"
          className="form-control"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div>IDも入力してください</div>
        <input
          type="number"
          className="form-control"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
        />
        <button
          className="btn btn-primary mt-2"
          onClick={handleLogin}
        >
          ログイン
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      <h2 className="h5 fw-bold">設定</h2>
      <div className="d-flex justify-content-between align-items-center">
        <div>ようこそ <span className="modal-title">{name}</span> さん (ID: {userId})</div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
      <div className="d-flex align-items-center justify-content-between">
        <span>デバッグモード</span>
        <label className="d-flex align-items-center">
          <input
            type="checkbox"
            className="me-2"
            checked={debugMode}
            onChange={toggleDebugMode}
          />
          {debugMode ? 'ON' : 'OFF'}
        </label>
      </div>
    </div>
  );
}
