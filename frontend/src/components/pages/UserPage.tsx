import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import RankingPane from '../organisms/RankingPane';
import type { Period, RankingItem } from '../organisms/RankingPane';
import useUserInfo from '../../hooks/useUserInfo';
import useUserShrineRankings from '../../hooks/useUserShrineRankings';
import useUserDietyRankings from '../../hooks/useUserDietyRankings';
import useUserRankings from '../../hooks/useUserRankings';

interface UserInfo {
  id: number;
  name: string;
  followingCount: number;
  followerCount: number;
  isFollowing: boolean;
}

interface UserPageProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
}

export default function UserPage({ id, onShowShrine, onShowDiety }: UserPageProps) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [shrinePeriod, setShrinePeriod] = useState<Period>('all');
  const [dietyPeriod, setDietyPeriod] = useState<Period>('all');
  const [userRankingPeriod, setUserRankingPeriod] = useState<Period>('all');

  useEffect(() => {
    const storedId = localStorage.getItem('userId');
    if (storedId) setCurrentUserId(Number(storedId));
  }, []);

  const displayId = id ?? currentUserId;

  const {
    data: userInfo,
    isLoading,
    refetch,
  } = useUserInfo(displayId ?? undefined, currentUserId);

  const { data: shrineRankings = [] } = useUserShrineRankings(displayId, shrinePeriod);

  const { data: dietyRankings = [] } = useUserDietyRankings(displayId, dietyPeriod);

  const { data: userRankings = [] } = useUserRankings(userRankingPeriod);

  const handleFollow = async () => {
    if (!currentUserId || !userInfo) return;
    await fetch(`${API_BASE}/follows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
    });
    refetch();
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !userInfo) return;
    await fetch(`${API_BASE}/follows`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
    });
    refetch();
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

      <div className="modal-info flex items-center gap-4">
        <div>フォロー: {userInfo.followingCount}</div>
        <div>フォロワー: {userInfo.followerCount}</div>
        {currentUserId && currentUserId !== displayId && (
          userInfo.isFollowing ? (
            <button
              className="px-2 py-1 bg-red-500 text-white rounded text-sm"
              onClick={handleUnfollow}
            >
              フォロー解除
            </button>
          ) : (
            <button
              className="px-2 py-1 bg-green-500 text-white rounded text-sm"
              onClick={handleFollow}
            >
              フォローする
            </button>
          )
        )}
      </div>

      <div className="modal-section">
        <div className="modal-subtitle">よく参拝する神社</div>
        <RankingPane
          items={shrineRankings.map((item, idx) => ({
            id: item.id,
            name: item.name,
            count: item.count,
            rank: idx + 1
          }))}
          type="shrine"
          period={shrinePeriod}
          onPeriodChange={setShrinePeriod}
          onItemClick={onShowShrine}
        />
      </div>

      <div className="modal-section">
        <div className="modal-subtitle">よく参拝する神様</div>
        <RankingPane
          items={dietyRankings.map((item, idx) => ({
            id: item.id,
            name: item.name,
            count: item.count,
            rank: idx + 1
          }))}
          type="diety"
          period={dietyPeriod}
          onPeriodChange={setDietyPeriod}
          onItemClick={onShowDiety}
        />
      </div>
    </div>
  );
}
