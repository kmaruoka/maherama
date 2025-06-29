import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import CustomLink from '../atoms/CustomLink';

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

interface UserPageProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
}

export default function UserPage({ id, onShowShrine, onShowDiety }: UserPageProps) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem('userId');
    if (storedId) setCurrentUserId(Number(storedId));
  }, []);

  const displayId = id ?? currentUserId;

  const { data: userInfo, isLoading } = useQuery({
    queryKey: ['user', displayId, currentUserId],
    queryFn: async () => {
      if (!displayId) return null;
      const viewerId = currentUserId || displayId;
      const res = await fetch(`${API_BASE}/users/${displayId}?viewerId=${viewerId}`);
      if (!res.ok) throw new Error('ユーザー情報の取得に失敗しました');
      return res.json() as Promise<UserInfo>;
    },
    enabled: !!displayId
  });

  const { data: rankings } = useQuery({
    queryKey: ['user-rankings'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/user-rankings`);
      if (!response.ok) throw new Error('ランキングの取得に失敗しました');
      return response.json() as Promise<RankingItem[]>;
    }
  });

  const handleFollow = async () => {
    if (!currentUserId || !targetId || !userInfo) return;
    await fetch(`${API_BASE}/follows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: currentUserId, followingId: Number(targetId) }),
    });
    // クエリを再取得
    window.location.reload();
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !targetId || !userInfo) return;
    await fetch(`${API_BASE}/follows`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: currentUserId, followingId: Number(targetId) }),
    });
    // クエリを再取得
    window.location.reload();
  };

  if (!displayId) {
    return <div className="p-4">ユーザーIDが指定されていません</div>;
  }

  if (isLoading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (!userInfo) {
    return <div className="p-4">ユーザーが見つかりません</div>;
  }

  return (
    <div className="modal-content">
      <h1 className="modal-title text-2xl mb-4">
        {userInfo.name}
      </h1>

      <div className="modal-info">
        <div>フォロー: {userInfo.followingCount}</div>
        <div>フォロワー: {userInfo.followerCount}</div>
      </div>

      {currentUserId && currentUserId !== displayId && (
        <div className="modal-section">
          <div className="modal-subtitle">フォロー操作</div>
          <div className="flex space-x-2 items-center">
            <input
              type="number"
              className="border p-1 text-sm"
              placeholder="ユーザーID"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
            <button
              className="px-2 py-1 bg-green-500 text-white rounded text-sm"
              onClick={handleFollow}
            >
              フォロー
            </button>
            <button
              className="px-2 py-1 bg-red-500 text-white rounded text-sm"
              onClick={handleUnfollow}
            >
              アンフォロー
            </button>
          </div>
        </div>
      )}

      {userInfo.topShrines.length > 0 && (
        <div className="modal-section">
          <div className="modal-subtitle">よく参拝する神社</div>
          <div className="flex flex-wrap gap-2">
            {userInfo.topShrines.map((shrine) => (
              <CustomLink
                key={shrine.id}
                onClick={() => onShowShrine && onShowShrine(shrine.id)}
                className="tag-link tag-shrine"
              >
                {shrine.name}
              </CustomLink>
            ))}
          </div>
        </div>
      )}

      {userInfo.topDieties.length > 0 && (
        <div className="modal-section">
          <div className="modal-subtitle">よく参拝する神</div>
          <div className="flex flex-wrap gap-2">
            {userInfo.topDieties.map((diety) => (
              <CustomLink
                key={diety.id}
                onClick={() => onShowDiety && onShowDiety(diety.id)}
                className="tag-link tag-diety"
              >
                {diety.name}
              </CustomLink>
            ))}
          </div>
        </div>
      )}

      {rankings && (
        <div className="modal-section">
          <div className="modal-subtitle">参拝数ランキング</div>
          <div className="space-y-2">
            {rankings.slice(0, 5).map((item) => (
              <div key={item.userId} className="modal-item">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    item.rank === 2 ? 'bg-gray-300 text-gray-700' :
                    item.rank === 3 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {item.rank}
                  </span>
                  <CustomLink className="tag-link tag-user">{item.userName}</CustomLink>
                </div>
                <span className="modal-item-text">{item.count}回</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
