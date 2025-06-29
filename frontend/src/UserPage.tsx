import { useEffect, useState } from 'react';

interface RankingItem {
  rank: number;
  userId: number;
  userName: string;
  count: number;
}

interface UserInfo {
  id: number;
  name: string;
  followingCount: number;
  followerCount: number;
  topShrines: { id: number; name: string; count: number }[];
  topDieties: { id: number; name: string; count: number }[];
  isFollowing: boolean;
}

export default function UserPage() {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [idInput, setIdInput] = useState('');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedId = localStorage.getItem('userId');
    if (storedName) setName(storedName);
    if (storedId) setUserId(Number(storedId));
  }, []);

  useEffect(() => {
    if (userId) fetchInfo(userId);
  }, [userId]);

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

  const fetchInfo = async (uid: number) => {
    try {
      const res = await fetch(`http://localhost:3001/users/${uid}?viewerId=${uid}`);
      if (res.ok) {
        setInfo(await res.json());
      }
    } catch (e) {
      console.error('ユーザー情報取得エラー:', e);
    }
  };

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
    setInfo(null);
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
      <div className="flex justify-between items-center">
        <div>ようこそ {name} さん (ID: {userId})</div>
        <button
          className="px-2 py-1 bg-gray-400 text-white rounded"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>

      {info && (
        <div className="space-y-2 border p-2 rounded">
          <div>フォロー: {info.followingCount}</div>
          <div>フォロワー: {info.followerCount}</div>
          <div className="flex space-x-2 items-center mt-2">
            <input
              type="number"
              className="border p-1"
              placeholder="ユーザーID"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
            <button
              className="px-2 py-1 bg-green-500 text-white rounded"
              onClick={async () => {
                if (!userId || !targetId) return;
                await fetch('http://localhost:3001/follows', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ followerId: userId, followingId: Number(targetId) }),
                });
                fetchInfo(userId);
              }}
            >
              フォロー
            </button>
            <button
              className="px-2 py-1 bg-red-500 text-white rounded"
              onClick={async () => {
                if (!userId || !targetId) return;
                await fetch('http://localhost:3001/follows', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ followerId: userId, followingId: Number(targetId) }),
                });
                fetchInfo(userId);
              }}
            >
              アンフォロー
            </button>
          </div>
        </div>
      )}
      
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
