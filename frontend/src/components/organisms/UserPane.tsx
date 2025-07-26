import React, { useState, forwardRef, useImperativeHandle } from 'react';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { API_BASE, apiCall } from '../../config/api';
import RankingPane from './RankingPane';
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
import { useSubscription } from '../../hooks/useSubscription';
import { useTranslation } from 'react-i18next';

interface UserPageProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
  onClose?: () => void;
}

type DetailViewType = 'overview' | 'shrine-ranking' | 'diety-ranking';

export interface UserPaneRef {
  backToOverview: () => void;
}

const UserPage = forwardRef<UserPaneRef, UserPageProps>(({ id, onShowShrine, onShowDiety, onShowUser, onClose }, ref) => {
  const { t } = useTranslation();
  const [currentUserId] = useLocalStorageState<number | null>('userId', null);
  const [detailView, setDetailView] = useState<DetailViewType>('overview');
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

  const { data: subscription } = useSubscription(displayId ?? null);

  const { skin } = useSkin();

  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowerModal, setShowFollowerModal] = useState(false);

  // refで外部から呼び出せるメソッドを定義
  useImperativeHandle(ref, () => ({
    backToOverview: () => setDetailView('overview')
  }));

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
    return <div className="p-3">{t('userIdNotSpecified')}</div>;
  }

  if (isLoading) {
    return <div className="p-3">{t('loading')}</div>;
  }

  if (!userInfo) {
    return <div className="p-3">{t('userNotFound')}</div>;
  }

  // 型安全なサムネイル取得
  const thumbnailUrl = (userInfo as { thumbnailUrl?: string } | undefined)?.thumbnailUrl || NOIMAGE_USER_URL;

  if (currentUserId && currentUserId === displayId) {
    // console.log('abilities:', abilities); // ← デバッグ用ログ削除
  }

  // 詳細表示のレンダリング関数
  const renderDetailContent = () => {
    if (detailView === 'shrine-ranking') {
      return (
        <>
          <div className="modal-subtitle">{t('oftenPrayedShrines')}</div>
          <RankingPane
            itemsByPeriod={userShrineRankingsByPeriod}
            type="shrine"
            isLoading={isUserShrineRankingLoading}
            onItemClick={onShowShrine}
            maxItems={100}
          />
        </>
      );
    } else if (detailView === 'diety-ranking') {
      return (
        <>
          <div className="modal-subtitle">{t('oftenPrayedDeities')}</div>
          <RankingPane
            itemsByPeriod={userDietyRankingsByPeriod}
            type="diety"
            isLoading={isUserDietyRankingLoading}
            onItemClick={onShowDiety}
            maxItems={100}
          />
        </>
      );
    }
    return null;
  };

  if (detailView !== 'overview') {
    return (
      <div>
        {renderDetailContent()}
      </div>
    );
  }

  return (
    <div>
      <div className="pane__header">
        <div className="pane__thumbnail">
          <img
            src={thumbnailUrl}
            alt="ユーザーサムネイル"
            className="pane__thumbnail-img"
          />
        </div>
        <div className="pane__info">
          <div className="pane__title">{userInfo.name}</div>
          <div className="pane__meta">
            <span>{t('level')}: {userInfo.level}</span>
            <span>{t('prayDistanceMeters')}: {levelInfo?.stats.pray_distance ?? '...'}m</span>
            <span>{t('remotePrayCount')}: {userInfo.worship_count}回/日</span>
            <span>{t('exp')}: {userInfo.exp}</span>
          </div>
          <div className="pane__actions">
            {currentUserId && currentUserId !== displayId && (
              userInfo.is_following ? (
                <CustomButton onClick={handleUnfollow}>{t('unfollow')}</CustomButton>
              ) : (
                <CustomButton onClick={handleFollow}>{t('follow')}</CustomButton>
              )
            )}
            <span className="pane__follow" onClick={() => setShowFollowingModal(true)}>{t('following')}: {userInfo.following_count}</span>
            <span className="pane__follow" onClick={() => setShowFollowerModal(true)}>{t('followers')}: {userInfo.follower_count}</span>
          </div>
        </div>
      </div>

      <div className="modal-section">
        <div className="modal-subtitle" onClick={() => setDetailView('shrine-ranking')} style={{ cursor: 'pointer' }}>{t('oftenPrayedShrines')}</div>
        <RankingPane
          itemsByPeriod={userShrineRankingsByPeriod}
          type="shrine"
          isLoading={isUserShrineRankingLoading}
          onItemClick={onShowShrine}
          maxItems={3}
        />
      </div>
      <FollowModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title={t('followingUsers')}
        users={followingUsers}
        isLoading={isFollowingLoading}
        error={followingError}
        onUserClick={onShowUser}
      />
      <FollowModal
        isOpen={showFollowerModal}
        onClose={() => setShowFollowerModal(false)}
        title={t('followers')}
        users={followerUsers}
        isLoading={isFollowersLoading}
        error={followersError}
        onUserClick={onShowUser}
      />
      <div className="modal-section">
        <div className="modal-subtitle" onClick={() => setDetailView('diety-ranking')} style={{ cursor: 'pointer' }}>{t('oftenPrayedDeities')}</div>
        <RankingPane
          itemsByPeriod={userDietyRankingsByPeriod}
          type="diety"
          isLoading={isUserDietyRankingLoading}
          onItemClick={onShowDiety}
          maxItems={3}
        />
      </div>

      {currentUserId && currentUserId === displayId && (
        <div className="mb-3">
          <div className="modal-subtitle">{t('abilityUnlock')}</div>
          <div className="modal-subtitle">{t('abilityPoints')}: {userInfo.ability_points}</div>
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
                    <span className="ms-2 text-success" style={{ fontWeight: 500 }}>{t('unlocked')}</span>
                  ) : (
                    <CustomButton
                      color={skin.colors.surface}
                      textColor={skin.colors.text}
                      hoverColor={skin.colors.primary}
                      disabledColor={skin.colors.disabled}
                      style={{ fontSize: '0.95em', minWidth: 90, marginLeft: 8 }}
                      onClick={() => acquireAbility(a.id)}
                      disabled={!a.can_purchase}
                      title={a.description}
                    >
                      {t('consumeAbilityPoints', { cost: a.cost })}
                    </CustomButton>
                  )}
                </div>
              ))}
            {/* サブスク権限判定 */}
            {subscription?.subscriptions?.some(s => s.subscription_type === 'reset_abilities' && s.is_active) ? (
              <CustomButton
                color={skin.colors.accent}
                textColor={skin.colors.surface}
                hoverColor={skin.colors.surface}
                disabledColor={skin.colors.disabled}
                style={{ fontWeight: 500, marginTop: 8 }}
                onClick={resetAbilities}
              >
                {t('abilityReset')}
              </CustomButton>
            ) : (
              <CustomButton
                color={skin.colors.surface}
                textColor={skin.colors.text}
                hoverColor={skin.colors.primary}
                disabledColor={skin.colors.disabled}
                style={{ fontWeight: 500, marginTop: 8 }}
                onClick={handleBuyResetAbilities}
              >
                {t('buyAbilityReset')}
              </CustomButton>
            )}
          </div>
        </div>
      )}
      {titles.length > 0 && (
        <div className="mt-4">
          <div className="modal-subtitle">{t('titles')}</div>
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
    </div>
  );
});

export default UserPage;
