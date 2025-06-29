import { useEffect, useState } from 'react';

interface RankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

export default function UserPage() {
  const [name, setName] = useState('');
  const [input, setInput] = useState('');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('userName');
    if (stored) setName(stored);
  }, []);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/user-rankings');
      if (response.ok) {
        const data = await response.json();
        setRankings(data);
      }
    } catch (error) {
      console.error('ランキング取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>ようこそ {name} さん</div>
        <button
          className="px-2 py-1 bg-gray-400 text-white rounded"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
      
      <div className="border rounded p-4">
        <h2 className="text-lg font-bold mb-4">参拝数ランキング</h2>
        {loading ? (
          <div>読み込み中...</div>
        ) : rankings.length > 0 ? (
          <div className="space-y-2">
            {rankings.map((item) => (
              <div key={item.userId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-lg">{item.rank}</span>
                  <span className={item.userName === name ? 'font-bold text-blue-600' : ''}>
                    {item.userName}
                  </span>
                </div>
                <span className="text-gray-600">{item.count}回</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">ランキングデータがありません</div>
        )}
      </div>
    </div>
  );
}
