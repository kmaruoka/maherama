import React, { useState } from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import useAllUsers from '../../hooks/useAllUsers';
import { useSkin } from '../../skins/SkinContext';
import { skins } from '../../skins';
import { useBarrier } from '../../barriers/BarrierContext';
import { barriers } from '../../barriers';
import CustomButton from '../atoms/CustomButton';

export default function SettingsPage() {
  const [userId, setUserId] = useLocalStorageState<number | null>('userId', null);
  const [idInput, setIdInput] = useState('');
  const [debugMode, setDebugMode] = useLocalStorageState('debugMode', false);
  const { skinName, setSkinName } = useSkin();
  const { barrierName, setBarrierName } = useBarrier();
  const { data: users = [], isLoading } = useAllUsers();

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
        <div>IDを入力するかテストユーザー一覧から選択してログインしてください</div>
        <input
          type="number"
          className="form-control"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
        />
        <div className="text-muted small mt-2">
          <div className="border rounded p-3 bg-light">
            <div className="fw-bold mb-2">テストユーザー一覧:</div>
            <div className="mt-1">
              {isLoading ? (
                <div>読み込み中...</div>
              ) : (
                users.map(user => (
                  <div 
                    key={user.id} 
                    className={`py-1 ${Number(idInput) === user.id ? 'fw-bold text-primary' : ''}`}
                    style={{cursor: 'pointer'}}
                    onClick={() => setIdInput(String(user.id))}
                  >
                    ID: {user.id} - {user.name} (Lv.{user.level} / EXP: {user.exp} / AP: {user.ability_points})
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <CustomButton
          color="#007bff"
          hoverColor="#0056b3"
          disabledColor="#b8daff"
          style={{ marginTop: 8 }}
          onClick={handleLogin}
        >
          ログイン
        </CustomButton>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      <h2 className="h5 fw-bold">設定</h2>
      <div className="d-flex justify-content-between align-items-center">
        {(() => {
          const user = users.find(u => u.id === Number(userId));
          return (
            <div>
              ログイン中 (ID: {userId} / {user?.name} / Lv.{user?.level} / EXP: {user?.exp})
            </div>
          );
        })()}
        <CustomButton
          color="#6c757d"
          hoverColor="#495057"
          disabledColor="#ced4da"
          style={{ marginLeft: 8 }}
          onClick={handleLogout}
        >
          ログアウト
        </CustomButton>
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
          className="form-select skin-select w-auto ms-2"
          value={skinName}
          onChange={e => setSkinName(e.target.value as keyof typeof skins)}
        >
          {Object.entries(skins).map(([key, skin]) => (
            <option key={key} value={key}>{skin.name}</option>
          ))}
        </select>
      </div>
      <div className="d-flex align-items-center justify-content-between mt-3">
        <span>結界</span>
        <select
          className="form-select skin-select w-auto ms-2"
          value={barrierName}
          onChange={e => setBarrierName(e.target.value as keyof typeof barriers)}
        >
          {Object.entries(barriers).map(([key, b]) => (
            <option key={key} value={key}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
