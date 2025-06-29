import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [idInput, setIdInput] = useState('');
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedId = localStorage.getItem('userId');
    const storedDebug = localStorage.getItem('debugMode');
    if (storedName) setName(storedName);
    if (storedId) setUserId(Number(storedId));
    if (storedDebug) setDebugMode(storedDebug === 'true');
  }, []);

  const handleLogin = () => {
    if (input.trim() && idInput.trim()) {
      localStorage.setItem('userName', input.trim());
      localStorage.setItem('userId', idInput.trim());
      setName(input.trim());
      setUserId(Number(idInput));
      setInput('');
      setIdInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    setName('');
    setUserId(null);
  };

  const toggleDebugMode = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
    localStorage.setItem('debugMode', String(newValue));
  };

  if (!name) {
    return (
      <div className="p-4 space-y-2">
        <h2 className="text-lg font-bold mb-4">ログイン</h2>
        <div>ユーザー名を入力してください</div>
        <input
          type="text"
          className="border p-1 w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div>IDも入力してください</div>
        <input
          type="number"
          className="border p-1 w-full"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
        />
        <button
          className="px-2 py-1 bg-blue-500 text-white rounded"
          onClick={handleLogin}
        >
          ログイン
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">設定</h2>
      <div className="flex justify-between items-center">
        <div>ようこそ <span className="modal-title">{name}</span> さん (ID: {userId})</div>
        <button
          className="px-2 py-1 bg-gray-400 text-white rounded"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span>デバッグモード</span>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="mr-2"
            checked={debugMode}
            onChange={toggleDebugMode}
          />
          {debugMode ? 'ON' : 'OFF'}
        </label>
      </div>
    </div>
  );
}
