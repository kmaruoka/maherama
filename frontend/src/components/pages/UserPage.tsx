import React, { useState } from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
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
  thumbnailUrl?: string;
}

interface UserPageProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
}

export default function UserPage({ id, onShowShrine, onShowDiety }: UserPageProps) {
  const [currentUserId] = useLocalStorageState<number | null>('userId', null);
  const [shrinePeriod, setShrinePeriod] = useState<Period>('all');
  const [dietyPeriod, setDietyPeriod] = useState<Period>('all');
  const [userRankingPeriod, setUserRankingPeriod] = useState<Period>('all');

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
    return <div className="p-3">ユーザーIDが指定されていません</div>;
  }

  if (isLoading) {
    return <div className="p-3">読み込み中...</div>;
  }

  if (!userInfo) {
    return <div className="p-3">ユーザーが見つかりません</div>;
  }

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="relative">
          <img
            src={userInfo.thumbnailUrl ? userInfo.thumbnailUrl : '/images/noimage-user.png'}
            alt="ユーザーサムネイル"
            className="rounded-circle shadow"
            style={{ width: '6rem', height: '6rem', objectFit: 'contain' }}
          />
        </div>
        <div>
          <h1 className="modal-title h4 mb-4">
            {userInfo.name}
          </h1>
          <div className="modal-info d-flex align-items-center gap-4">
            <div>フォロー: {userInfo.followingCount}</div>
            <div>フォロワー: {userInfo.followerCount}</div>
            {currentUserId && currentUserId !== displayId && (
              userInfo.isFollowing ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleUnfollow}
                >
                  フォロー解除
                </button>
              ) : (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleFollow}
                >
                  フォローする
                </button>
              )
            )}
          </div>
        </div>
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
    </>
  );
}
