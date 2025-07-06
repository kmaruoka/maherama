import React from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { API_BASE } from '../../config/api';
import RankingPane from '../organisms/RankingPane';
import useUserInfo from '../../hooks/useUserInfo';
import useUserShrineRankings from '../../hooks/useUserShrineRankings';
import useUserDietyRankings from '../../hooks/useUserDietyRankings';
import useUserTitles from '../../hooks/useUserTitles';
import useAbilityList from '../../hooks/useAbilityList';

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

  const { data: titles = [] } = useUserTitles(displayId ?? undefined);
  const { data: abilities = [], refetch: refetchAbilities } = useAbilityList();

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

  const acquireAbility = async (abilityId: number) => {
    await fetch(`${API_BASE}/abilities/${abilityId}/acquire`, {
      method: 'POST',
      headers: { 'x-user-id': String(currentUserId) },
    });
    refetch();
    refetchAbilities();
  };

  const resetAbilities = async () => {
    await fetch(`${API_BASE}/user/reset-abilities`, {
      method: 'POST',
      headers: { 'x-user-id': String(currentUserId) },
    });
    refetch();
    refetchAbilities();
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

      <div className="mb-3">
        <div>レベル: {userInfo.level}</div>
        <div>経験値: {userInfo.exp}</div>
        {titles.length > 0 && (
          <div className="mt-2">
            <div className="modal-subtitle">称号</div>
            <ul className="list-unstyled">
              {titles.map(t => (
                <li key={t.id}>🏆 {t.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {currentUserId && currentUserId === displayId && (
        <div className="mb-3">
          <div className="modal-subtitle">能力</div>
          <div className="d-grid gap-2">
            {abilities.map(a => (
              <button key={a.id} className="btn btn-outline-primary btn-sm" onClick={() => acquireAbility(a.id)}>
                {a.name} ({a.cost}pt)
              </button>
            ))}
            <button className="btn btn-warning btn-sm" onClick={resetAbilities}>能力初期化</button>
          </div>
        </div>
      )}

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
