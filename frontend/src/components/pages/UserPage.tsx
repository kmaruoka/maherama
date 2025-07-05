import React from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { API_BASE } from '../../config/api';
import RankingPane from '../organisms/RankingPane';
import useUserInfo from '../../hooks/useUserInfo';
import useUserShrineRankings from '../../hooks/useUserShrineRankings';
import useUserDietyRankings from '../../hooks/useUserDietyRankings';

interface UserPageProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
}

export default function UserPage({ id, onShowShrine, onShowDiety }: UserPageProps) {
  const [currentUserId] = useLocalStorageState<number | null>('userId', null);
  const displayId = id ?? currentUserId;

  const {
    data: userInfo,
    isLoading,
    refetch,
  } = useUserInfo(displayId ?? undefined, currentUserId);

  const { data: userShrineRankingsByPeriod, isLoading: isUserShrineRankingLoading } = useUserShrineRankings(displayId ?? undefined);
  const { data: userDietyRankingsByPeriod, isLoading: isUserDietyRankingLoading } = useUserDietyRankings(displayId ?? undefined);

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

  // 型安全なサムネイル取得
  const thumbnailUrl = (userInfo as { thumbnailUrl?: string } | undefined)?.thumbnailUrl || '/images/noimage-user.png';

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="relative">
          <img
            src={thumbnailUrl}
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
          itemsByPeriod={userShrineRankingsByPeriod}
          type="shrine"
          isLoading={isUserShrineRankingLoading}
          onItemClick={onShowShrine}
        />
      </div>

      <div className="modal-section">
        <div className="modal-subtitle">よく参拝する神様</div>
        <RankingPane
          itemsByPeriod={userDietyRankingsByPeriod}
          type="diety"
          isLoading={isUserDietyRankingLoading}
          onItemClick={onShowDiety}
        />
      </div>
    </>
  );
}
