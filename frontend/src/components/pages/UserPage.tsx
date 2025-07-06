import React, { useState } from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { API_BASE, apiCall } from '../../config/api';
import RankingPane from '../organisms/RankingPane';
import useUserInfo from '../../hooks/useUserInfo';
import useUserShrineRankings from '../../hooks/useUserShrineRankings';
import useUserDietyRankings from '../../hooks/useUserDietyRankings';
import useUserTitles from '../../hooks/useUserTitles';
import useAbilityList from '../../hooks/useAbilityList';
import useFollowing from '../../hooks/useFollowing';
import useFollowers from '../../hooks/useFollowers';
import FollowModal from '../molecules/FollowModal';
import { useSkin } from '../../skins/SkinContext';
import { NOIMAGE_USER_URL } from '../../constants';

interface UserPageProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
}

export default function UserPage({ id, onShowShrine, onShowDiety, onShowUser }: UserPageProps) {
  const [currentUserId] = useLocalStorageState<number | null>('userId', null);
  const displayId = id ?? currentUserId;

  const {
    data: userInfo,
    isLoading,
    refetch,
  } = useUserInfo(displayId ?? undefined, currentUserId);

  const { data: titles = [] } = useUserTitles(displayId ?? undefined);
  const { data: abilities = [], refetch: refetchAbilities } = useAbilityList(displayId);

  const { data: userShrineRankingsByPeriod, isLoading: isUserShrineRankingLoading } = useUserShrineRankings(displayId ?? undefined);
  const { data: userDietyRankingsByPeriod, isLoading: isUserDietyRankingLoading } = useUserDietyRankings(displayId ?? undefined);

  const { data: followingUsers, isLoading: isFollowingLoading, error: followingError, refetch: refetchFollowing } = useFollowing(displayId ?? undefined);
  const { data: followerUsers, isLoading: isFollowersLoading, error: followersError, refetch: refetchFollowers } = useFollowers(displayId ?? undefined);

  const { skin } = useSkin();

  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowerModal, setShowFollowerModal] = useState(false);

  const handleFollow = async () => {
    if (!currentUserId || !userInfo) return;
    await apiCall(`${API_BASE}/follows`, {
      method: 'POST',
      body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
    });
    refetch();
    refetchFollowing();
    refetchFollowers();
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !userInfo) return;
    await apiCall(`${API_BASE}/follows`, {
      method: 'DELETE',
      body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
    });
    refetch();
    refetchFollowing();
    refetchFollowers();
  };

  const acquireAbility = async (abilityId: number) => {
    await apiCall(`${API_BASE}/abilities/${abilityId}/acquire`, {
      method: 'POST',
    });
    refetch();
    refetchAbilities();
  };

  const resetAbilities = async () => {
    await apiCall(`${API_BASE}/user/reset-abilities`, {
      method: 'POST',
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
  const thumbnailUrl = (userInfo as { thumbnailUrl?: string } | undefined)?.thumbnailUrl || NOIMAGE_USER_URL;

  if (currentUserId && currentUserId === displayId) {
    console.log('abilities:', abilities);
  }

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
          <h1 className="modal-title h4 mb-2">
            {userInfo.name}
          </h1>
          <div className="modal-info d-flex align-items-center gap-4 mb-2">
            <div 
              role="button" 
              className="text-primary" 
              style={{cursor: 'pointer'}}
              onClick={() => setShowFollowingModal(true)}
            >
              フォロー: {userInfo.following_count}
            </div>
            <div
              role="button"
              className="text-primary"
              style={{cursor: 'pointer'}} 
              onClick={() => setShowFollowerModal(true)}
            >
              フォロワー: {userInfo.follower_count}
            </div>
            {currentUserId && currentUserId !== displayId && (
              userInfo.is_following ? (
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
          <div className="d-flex gap-3">
            <span>レベル: {userInfo.level}</span>
            <span>参拝距離: {userInfo.pray_distance}m</span>
            <span>遥拝回数: {userInfo.worship_count}回/日</span>
            <span>経験値: {userInfo.exp}</span>
            <span>能力値: {userInfo.ability_points}</span>
          </div>
        </div>
      </div>

      <div className="mb-3">
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
          <div className="modal-subtitle">能力解放</div>
          <div className="d-grid gap-1">
            {abilities
              .filter(a => a.can_purchase || a.current_level > 0)
              .map(a => (
                <div key={a.id} className="d-flex align-items-center mb-1" style={{fontSize: '0.95em'}}>
                  <span
                    className="fw-bold text-truncate"
                    title={a.description}
                    style={{maxWidth: 180, display: 'inline-block'}}
                  >
                    {a.name}
                    {a.current_level > 0 && a.max_level > 1 && (
                      <span className="ms-1 badge bg-primary">Lv.{a.current_level}</span>
                    )}
                  </span>
                  <button
                    className="btn btn-xs ms-2 px-2 py-0"
                    style={{
                      background: a.can_purchase ? skin.colors.surface : skin.colors.disabled,
                      color: a.can_purchase ? skin.colors.text : skin.colors.textMuted,
                      border: `1px solid ${a.can_purchase ? skin.colors.primary : skin.colors.disabled}`,
                      borderRadius: '1em',
                      fontWeight: 500,
                      fontSize: '0.95em',
                      opacity: a.can_purchase ? 1 : 0.6,
                      minWidth: 90
                    }}
                    onClick={() => acquireAbility(a.id)}
                    disabled={!a.can_purchase}
                    title={a.description}
                  >
                    {a.current_level > 0 ? 'レベルアップ' : '獲得'}
                    <span className="ms-1 small">({a.next_cost})</span>
                  </button>
                </div>
              ))}
            <button
              className="btn btn-sm mt-2"
              style={{
                background: skin.colors.accent,
                color: skin.colors.surface,
                border: `2px solid ${skin.colors.accent}`,
                borderRadius: skin.borderRadius,
                fontWeight: 500,
                boxShadow: skin.boxShadow,
                transition: 'background 0.2s, color 0.2s',
              }}
              onClick={resetAbilities}
              onMouseOver={e => { e.currentTarget.style.background = skin.colors.surface; e.currentTarget.style.color = skin.colors.accent; }}
              onMouseOut={e => { e.currentTarget.style.background = skin.colors.accent; e.currentTarget.style.color = skin.colors.surface; }}
            >
              能力初期化（有料）
            </button>
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
      <FollowModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title="フォロー中"
        users={followingUsers}
        isLoading={isFollowingLoading}
        error={followingError}
        onUserClick={onShowUser}
      />
      <FollowModal
        isOpen={showFollowerModal}
        onClose={() => setShowFollowerModal(false)}
        title="フォロワー"
        users={followerUsers}
        isLoading={isFollowersLoading}
        error={followersError}
        onUserClick={onShowUser}
      />
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
