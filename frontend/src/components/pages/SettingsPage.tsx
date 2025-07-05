import React, { useState } from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useSkin } from '../../skins/SkinContext';
import { skins } from '../../skins';

export default function SettingsPage() {
  const [userId, setUserId] = useLocalStorageState<number | null>('userId', null);
  const [idInput, setIdInput] = useState('');
  const [debugMode, setDebugMode] = useLocalStorageState('debugMode', false);
  const { skinName, setSkinName } = useSkin();

  const handleLogin = () => {
    if (idInput.trim()) {
      setUserId(Number(idInput));
      setIdInput('');
    }
  };

  const handleLogout = () => {
    setUserId(null);
  };

  const toggleDebugMode = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
  };

  if (!userId) {
    return (
      <div className="p-3">
        <h2 className="h5 fw-bold mb-3">ログイン</h2>
        <div>IDを入力してください</div>
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
        <div>ログイン中 (ID: {userId})</div>
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
      <div className="d-flex align-items-center justify-content-between mt-3">
        <span>スキン</span>
        <select
          className="form-select w-auto ms-2"
          value={skinName}
          onChange={e => setSkinName(e.target.value as keyof typeof skins)}
        >
          {Object.entries(skins).map(([key, skin]) => (
            <option key={key} value={key}>{skin.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
