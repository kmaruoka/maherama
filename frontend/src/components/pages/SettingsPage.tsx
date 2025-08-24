import { useState } from 'react';
import { barriers } from '../../barriers';
import { useBarrier } from '../../barriers/BarrierContext';
import useAllUsers from '../../hooks/useAllUsers';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { skins } from '../../skins';
import { useSkin } from '../../skins/SkinContext';
import CustomButton from '../atoms/CustomButton';
import PageTitle from '../atoms/PageTitle';

interface SettingsPageProps {
  onLogout?: () => void;
}

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const [userId, setUserId] = useLocalStorageState<number | null>('userId', null);
  const [idInput, setIdInput] = useState('');
  const [debugMode, setDebugMode] = useLocalStorageState('debugMode', false);
  const [maxShrineDisplay, setMaxShrineDisplay] = useLocalStorageState<number>('maxShrineDisplay', 100);
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
    // セキュアな認証システムでログアウト
    if (onLogout) {
      onLogout();
    }
  };

  const toggleDebugMode = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
  };

  if (!userId) {
    return (
      <div className="p-3">
        <h2 className="h5 fw-bold mb-3" style={{ color: 'var(--color-text)' }}>ログイン</h2>
        <div style={{ color: 'var(--color-text)' }}>IDを入力するかテストユーザー一覧から選択してログインしてください</div>
        <input
          type="number"
          className="form-control"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
        />
        <div className="small mt-2" style={{ color: 'var(--color-text-muted)' }}>
          <div className="border rounded p-3 bg-light">
            <div className="fw-bold mb-2" style={{ color: 'var(--color-text)' }}>テストユーザー一覧:</div>
            <div className="mt-1">
              {isLoading ? (
                <div style={{ color: 'var(--color-text-muted)' }}>読み込み中...</div>
              ) : (
                users.map(user => (
                  <div
                    key={user.id}
                    className={`py-1 settings-page__user-list-item ${Number(idInput) === user.id ? 'fw-bold' : ''}`}
                    style={{
                      color: Number(idInput) === user.id ? 'var(--color-primary)' : 'var(--color-text)',
                      cursor: 'pointer'
                    }}
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
          className="settings-page__login-button"
          onClick={handleLogin}
        >
          ログイン
        </CustomButton>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      <PageTitle title="設定" />
      <div className="d-flex justify-content-between align-items-center">
        {(() => {
          const user = users.find(u => u.id === Number(userId));
          return (
            <div style={{ color: 'var(--color-text)' }}>
              ログイン中 (ID: {userId} / {user?.name} / Lv.{user?.level} / EXP: {user?.exp})
            </div>
          );
        })()}
        <CustomButton
          color="#6c757d"
          hoverColor="#495057"
          disabledColor="#ced4da"
          className="settings-page__logout-button"
          onClick={handleLogout}
        >
          ログアウト
        </CustomButton>
      </div>
      <div className="d-flex align-items-center justify-content-between">
        <span style={{ color: 'var(--color-text)' }}>デバッグモード</span>
        <label className="d-flex align-items-center">
          <input
            type="checkbox"
            className="me-2"
            checked={debugMode}
            onChange={toggleDebugMode}
          />
          <span style={{ color: 'var(--color-text)' }}>{debugMode ? 'ON' : 'OFF'}</span>
        </label>
      </div>
      <div className="d-flex align-items-center justify-content-between mt-3">
        <span style={{ color: 'var(--color-text)' }}>スキン</span>
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
        <span style={{ color: 'var(--color-text)' }}>結界</span>
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
      <div className="d-flex align-items-center justify-content-between mt-3">
        <div>
          <span style={{ color: 'var(--color-text)' }}>神社表示上限数</span>
          <div className="small" style={{ color: 'var(--color-text-muted)' }}>端末性能に応じて調整してください</div>
        </div>
        <div className="d-flex align-items-center">
          <input
            type="range"
            className="form-range me-2"
            min="10"
            max="500"
            step="10"
            value={maxShrineDisplay}
            onChange={e => setMaxShrineDisplay(Number(e.target.value))}
            style={{ width: '128px' }}
          />
          <span className="text-nowrap" style={{ color: 'var(--color-text)' }}>{maxShrineDisplay}件</span>
        </div>
      </div>
      <div className="mt-2 small" style={{ color: 'var(--color-text-muted)' }}>
        推奨値: 低スペック端末 10-50件 / 標準端末 100件 / 高スペック端末 200-500件
      </div>
    </div>
  );
}
