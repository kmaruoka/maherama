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
import { CustomButton } from '../atoms/CustomButton';
import { useLevelInfo } from '../../hooks/usePrayDistance';
import CustomLink from '../atoms/CustomLink';

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
  const { data: levelInfo } = useLevelInfo(displayId);

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
    try {
      await apiCall(`${API_BASE}/user/reset-abilities`, {
        method: 'POST',
      });
      refetch();
      refetchAbilities();
    } catch (error) {
      console.error('能力初期化エラー:', error);
      // エラーメッセージから詳細を抽出
      const errorMessage = error instanceof Error ? error.message : '能力初期化に失敗しました';
      if (errorMessage.includes('能力初期化には有料サブスクリプションが必要です')) {
        alert('能力初期化には有料サブスクリプションが必要です。\n\nサブスクリプションを購入してから再度お試しください。');
      } else {
        alert(`能力初期化に失敗しました: ${errorMessage}`);
      }
    }
  };

  // Stripe能力初期化サブスクリプション購入
  const handleBuyResetAbilities = async () => {
    try {
      const res = await apiCall(`${API_BASE}/subscription/reset-abilities/checkout`, { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Stripe決済URLの取得に失敗しました');
      }
    } catch (error) {
      alert('Stripe決済画面の表示に失敗しました');
    }
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
    // console.log('abilities:', abilities); // ← デバッグ用ログ削除
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
              style={{ cursor: 'pointer' }}
              onClick={() => setShowFollowingModal(true)}
            >
              フォロー: {userInfo.following_count}
            </div>
            <div
              role="button"
              className="text-primary"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowFollowerModal(true)}
            >
              フォロワー: {userInfo.follower_count}
            </div>
            {currentUserId && currentUserId !== displayId && (
              userInfo.is_following ? (
                <CustomButton
                  color="#dc3545"
                  hoverColor="#a71d2a"
                  disabledColor="#f5b7b1"
                  onClick={handleUnfollow}
                  style={{ fontSize: 16, padding: '4px 16px' }}
                >
                  フォロー解除
                </CustomButton>
              ) : (
                <CustomButton
                  color="#28a745"
                  hoverColor="#218838"
                  disabledColor="#b1dfbb"
                  onClick={handleFollow}
                  style={{ fontSize: 16, padding: '4px 16px' }}
                >
                  フォローする
                </CustomButton>
              )
            )}

          </div>
          <div className="d-flex gap-3">
            <span>レベル: {userInfo.level}</span>
            <span>参拝距離: {levelInfo?.stats.pray_distance ?? '...'}m</span>
            <span>遥拝回数: {userInfo.worship_count}回/日</span>
            <span>経験値: {userInfo.exp}</span>
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

      {currentUserId && currentUserId === displayId && (
        <div className="mb-3">
          <div className="modal-subtitle">能力解放</div>
          <div className="modal-subtitle">能力値: {userInfo.ability_points}</div>
          <div className="d-grid gap-1">
            {abilities
              .filter(a => a.can_purchase || a.purchased)
              .map(a => (
                <div key={a.id} className="d-flex align-items-center mb-1" style={{ fontSize: '0.95em' }}>
                  <span
                    className="fw-bold text-truncate"
                    title={a.description}
                    style={{ maxWidth: 180, display: 'inline-block' }}
                  >
                    {a.name}
                  </span>
                  {a.purchased ? (
                    <span className="ms-2 text-success" style={{ fontWeight: 500 }}>解放済み</span>
                  ) : (
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
                      <span className="ms-1 small">能力値 {a.cost} を消費して解放</span>
                    </button>
                  )}
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
            <button
              className="btn btn-outline-primary btn-sm mt-2"
              style={{ marginLeft: 8 }}
              onClick={handleBuyResetAbilities}
            >
              能力初期化サブスクリプション購入（Stripe）
            </button>
          </div>
        </div>
      )}
      {titles.length > 0 && (
        <div className="mt-4">
          <div className="modal-subtitle">称号</div>
          <ul className="list-unstyled">
            {titles.map(t => (
              <li key={t.id} style={{ whiteSpace: 'nowrap' }}>
                🏆 {t.template && t.embed_data ? (
                  <span style={{ display: 'inline', whiteSpace: 'nowrap' }}>
                    {t.template.split(/(<\{[^}]+\}>)/g).map((part, idx) => {
                      if (part.startsWith('<{') && part.endsWith('}>')) {
                        const key = part.slice(2, -2);
                        if (key === 'shrine' && t.embed_data?.shrine && t.embed_data?.shrine_id) {
                          return (
                            <CustomLink key={idx} type="shrine" onClick={() => onShowShrine && onShowShrine(t.embed_data?.shrine_id)}>
                              {t.embed_data?.shrine}
                            </CustomLink>
                          );
                        }
                        if (key === 'diety' && t.embed_data?.diety && t.embed_data?.diety_id) {
                          return (
                            <CustomLink key={idx} type="diety" onClick={() => onShowDiety && onShowDiety(t.embed_data?.diety_id)}>
                              {t.embed_data?.diety}
                            </CustomLink>
                          );
                        }
                        if (key === 'period' && t.embed_data?.period) {
                          return (
                            <CustomLink key={idx} type="default" onClick={() => alert(`称号獲得者一覧: ${(t.embed_data?.shrine || t.embed_data?.diety || '')} ${t.embed_data?.period}`)}>
                              {t.embed_data?.period}
                            </CustomLink>
                          );
                        }
                        // 他の埋め込みデータもそのまま表示
                        return t.embed_data?.[key] || '';
                      }
                      // part内の改行を除去して返す
                      return part.replace(/\r?\n/g, '');
                    })}
                  </span>
                ) : t.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
