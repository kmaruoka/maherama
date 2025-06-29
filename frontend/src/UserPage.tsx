import { useEffect, useState } from 'react';

export default function UserPage() {
  const [name, setName] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('userName');
    if (stored) setName(stored);
  }, []);

  const handleLogin = () => {
    if (input.trim()) {
      localStorage.setItem('userName', input.trim());
      setName(input.trim());
      setInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userName');
    setName('');
  };

  if (!name) {
    return (
      <div className="p-4 space-y-2">
        <div>ユーザー名を入力してください</div>
        <input
          type="text"
          className="border p-1 w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
    <div className="p-4 space-y-2">
      <div>ようこそ {name} さん</div>
      <button
        className="px-2 py-1 bg-gray-400 text-white rounded"
        onClick={handleLogout}
      >
        ログアウト
      </button>
    </div>
  );
}
