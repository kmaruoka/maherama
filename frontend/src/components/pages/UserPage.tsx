import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../../config/api';
import RankingPane from '../organisms/RankingPane';
import type { Period, RankingItem } from '../organisms/RankingPane';

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

  const { data: userInfo, isLoading, refetch } = useQuery({
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

  const { data: shrineRankings = [] } = useQuery<RankingItem[]>({
    queryKey: ['user-shrine-rankings', displayId, shrinePeriod],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users/${displayId}/shrine-rankings?period=${shrinePeriod}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!displayId
  });

  const { data: dietyRankings = [] } = useQuery<RankingItem[]>({
    queryKey: ['user-diety-rankings', displayId, dietyPeriod],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users/${displayId}/diety-rankings?period=${dietyPeriod}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!displayId
  });

  const userRankingApiMap: Record<Period, string> = {
    all: '/user-rankings',
    yearly: '/user-rankings-yearly',
    monthly: '/user-rankings-monthly',
    weekly: '/user-rankings-weekly',
  };

  const { data: userRankings = [] } = useQuery<RankingItem[]>({
    queryKey: ['user-rankings', userRankingPeriod],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${userRankingApiMap[userRankingPeriod]}`);
      if (!res.ok) return [];
      const arr = await res.json();
      return arr.map((item: any) => ({
        id: item.userId,
        name: item.userName,
        count: item.count,
        rank: item.rank
      }));
    },
  });

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
