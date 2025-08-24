import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCompressAlt, FaExpandAlt } from 'react-icons/fa';
import { apiCall } from '../../config/api';
import { NOIMAGE_USER_URL } from '../../constants';
import { useModal } from '../../contexts/ModalContext';
import { useFollowers } from '../../hooks/useFollowers';
import { useFollowing } from '../../hooks/useFollowing';
import { useImageManagement } from '../../hooks/useImageManagement';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useLevelInfo } from '../../hooks/usePrayDistance';
import useUserDietyRankings from '../../hooks/useUserDietyRankings';
import { useUserInfo } from '../../hooks/useUserInfo';
import useUserShrineRankings from '../../hooks/useUserShrineRankings';
import { useUserTitles } from '../../hooks/useUserTitles';
import { useSkin } from '../../skins/SkinContext';
import { CustomButton } from '../atoms/CustomButton';
import CustomLink from '../atoms/CustomLink';
import { AwardIcon } from '../atoms/CustomText';
import SizedThumbnailImage from '../atoms/SizedThumbnailImage';
import FollowModal from '../molecules/FollowModal';
import RankingPane from './RankingPane';

interface UserPageProps {
  id: number; // 必須に変更（他人用なので必ずIDが必要）
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
  onClose?: () => void;
}

type DetailViewType = 'overview' | 'shrine-ranking' | 'diety-ranking' | 'thumbnail';

export interface UserPaneRef {
  backToOverview: () => void;
  getTitle: () => string;
}

const UserPane = forwardRef<UserPaneRef, UserPageProps & { onDetailViewChange?: (detailView: DetailViewType) => void }>(
  ({ id, onShowShrine, onShowDiety, onShowUser, onClose, onDetailViewChange }, ref) => {
    const { t } = useTranslation();
    const [currentUserId] = useLocalStorageState<number | null>('userId', null);
    const [detailView, setDetailView] = useState<DetailViewType>('overview');
    const { updateCurrentModalName } = useModal();

    // detailViewが変更されたときに親コンポーネントに通知
    useEffect(() => {
      onDetailViewChange?.(detailView);
    }, [detailView, onDetailViewChange]);
    const displayId = id; // 他人用なので常にpropsのidを使用

    const {
      data: userInfo,
      isLoading,
      refetch,
    } = useUserInfo(displayId ?? undefined, currentUserId);

    const { data: titles = [] } = useUserTitles(displayId ?? undefined);
    const { data: levelInfo } = useLevelInfo(displayId);

    const { data: userShrineRankingsByPeriod, isLoading: isUserShrineRankingLoading } = useUserShrineRankings(displayId);
    const { data: userDietyRankingsByPeriod, isLoading: isUserDietyRankingLoading } = useUserDietyRankings(displayId);

    const { data: followingUsers, isLoading: isFollowingLoading, error: followingError, refetch: refetchFollowing } = useFollowing(displayId);
    const { data: followerUsers, isLoading: isFollowersLoading, error: followersError, refetch: refetchFollowers } = useFollowers(displayId);

    const { skin } = useSkin();

    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [showFollowerModal, setShowFollowerModal] = useState(false);

    // 画像管理フックを使用
    const [imageState, imageActions] = useImageManagement({
      entityType: 'user',
      entityId: displayId,
      userId: currentUserId || undefined,
      noImageUrl: NOIMAGE_USER_URL,
      queryKeys: ['user', String(displayId), 'user-info'],
      relatedQueryKeys: [
        ['user', String(displayId)],
        ['user-info', String(displayId)]
      ]
    });

    // データ取得後にgetTitleメソッドを更新
    useEffect(() => {
      if (userInfo?.name) {
        // データが取得されたら、親コンポーネントに通知してナビゲーション履歴を更新
        updateCurrentModalName(userInfo.name);
      }
    }, [userInfo?.name, updateCurrentModalName]);

    // 画像URLが変更されたときに画像管理フックに通知（統一されたロジックを使用）
    useEffect(() => {
      if (userInfo) {
        imageActions.setImageUrlFromEntityData(userInfo);
      }
    }, [userInfo, imageActions]);

    // refで外部から呼び出せるメソッドを定義
    useImperativeHandle(ref, () => ({
      backToOverview: () => setDetailView('overview'),
      getTitle: () => userInfo?.name || ''
    }));

    const handleFollow = async () => {
      if (!currentUserId || !userInfo) return;
      await apiCall(`/follows`, {
        method: 'POST',
        body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
      });
      refetch();
      refetchFollowing();
      refetchFollowers();
    };

    const handleUnfollow = async () => {
      if (!currentUserId || !userInfo) return;
      await apiCall(`/follows`, {
        method: 'DELETE',
        body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
      });
      refetch();
      refetchFollowing();
      refetchFollowers();
    };


    // displayIdは必須なので削除

    if (isLoading) {
      return <div className="p-3">{t('loading')}</div>;
    }

    if (!userInfo) {
      return <div className="p-3">{t('userNotFound')}</div>;
    }

    // 画像管理フックから画像URLを取得
    const userImageUrl = imageState.currentImageUrl || NOIMAGE_USER_URL;


    // 詳細表示のレンダリング関数
    const renderDetailContent = () => {
      if (detailView === 'thumbnail') {
        return (
          <SizedThumbnailImage
            key={`user-detail-${displayId}-${imageState.thumbCache}`}
            size="l"
            alt="ユーザーサムネイル"
            noImageUrl={NOIMAGE_USER_URL}
            expanded={true}
            images={{
              l: userInfo.image_url_l
            }}
            loadingText="読み込み中..."
            shouldUseFallback={imageState.shouldUseFallback}
            cacheKey={imageState.thumbCache}
            userInfo={{
              imageBy: (userInfo as any).image_by,
              imageByUserId: (userInfo as any).image_by_user_id,
              onShowUser: onShowUser
            }}
          />
        );
      } else if (detailView === 'shrine-ranking') {
        return (
          <div>
            <div className="modal-subtitle" onClick={() => setDetailView('overview')} style={{ cursor: 'pointer' }}>
              {t('oftenPrayedShrines')}
              <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
            </div>
            <RankingPane
              itemsByPeriod={userShrineRankingsByPeriod}
              type="shrine"
              isLoading={isUserShrineRankingLoading}
              onItemClick={onShowShrine}
              maxItems={100}
            />
          </div>
        );
      } else if (detailView === 'diety-ranking') {
        return (
          <div>
            <div className="modal-subtitle" onClick={() => setDetailView('overview')} style={{ cursor: 'pointer' }}>
              {t('oftenPrayedDeities')}
              <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
            </div>
            <RankingPane
              itemsByPeriod={userDietyRankingsByPeriod}
              type="diety"
              isLoading={isUserDietyRankingLoading}
              onItemClick={onShowDiety}
              maxItems={100}
            />
          </div>
        );
      }
      return null;
    };

    if (detailView !== 'overview') {
      return (
        <div onClick={(e) => {
          // リンクやボタン、カスタムリンクがクリックされた場合は通常表示に戻らない
          if ((e.target as HTMLElement).closest('a, button, .custom-link')) {
            return;
          }
          setDetailView('overview');
        }} className="cursor-pointer">
          {renderDetailContent()}
        </div>
      );
    }

    return (
      <Container fluid>
        {/* ヘッダー（サムネイルと情報） */}
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <SizedThumbnailImage
              key={`user-${displayId}-${imageState.thumbCache}`}
              alt="ユーザーサムネイル"
              noImageUrl={NOIMAGE_USER_URL}
              responsive={true}
              responsiveConfig={{
                breakpoints: [
                  { minWidth: 768, size: 'm' },   // タブレット以上: Mサイズ
                  { maxWidth: 767, size: 's' }    // スマホ以下: Sサイズ
                ],
                defaultSize: 's'
              }}
              images={{
                s: userInfo.image_url_s,
                m: userInfo.image_url_m
              }}
              loadingText="読み込み中..."
              shouldUseFallback={imageState.shouldUseFallback}
              cacheKey={imageState.thumbCache}
              upload={{
                onUploadClick: () => imageActions.setIsUploadModalOpen(true),
                showUploadButton: !!currentUserId && currentUserId === displayId
              }}
              userInfo={{
                imageBy: (userInfo as any).image_by,
                imageByUserId: (userInfo as any).image_by_user_id,
                onShowUser: onShowUser
              }}
              actions={{
                onClick: () => setDetailView('thumbnail')
              }}
            />
          </Col>
          <Col xs={12} md={6}>
            <div className="pane__info">
              <div className="pane__title">{userInfo.name}</div>
              <div className="pane__meta">
                <div className="field-row">
                  <span className="field-row__label">{t('level')}:</span>
                  <span className="field-row__value">{userInfo.level}</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">{t('prayDistanceMeters')}:</span>
                  <span className="field-row__value">{levelInfo?.stats.pray_distance ?? '...'}m</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">{t('remotePrayCount')}:</span>
                  <span className="field-row__value">{userInfo.worship_count}回/日</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">{t('exp')}:</span>
                  <span className="field-row__value">{userInfo.exp}</span>
                </div>
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
          </Col>
        </Row>

        {/* よく参拝する神社 */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="modal-section">
              <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('shrine-ranking')}>
                {t('oftenPrayedShrines')}
                <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
              </div>
              <RankingPane
                itemsByPeriod={userShrineRankingsByPeriod}
                type="shrine"
                isLoading={isUserShrineRankingLoading}
                onItemClick={onShowShrine}
                maxItems={3}
              />
            </div>
          </Col>
        </Row>

        {/* よく参拝する神様 */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="modal-section">
              <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('diety-ranking')}>
                {t('oftenPrayedDeities')}
                <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
              </div>
              <RankingPane
                itemsByPeriod={userDietyRankingsByPeriod}
                type="diety"
                isLoading={isUserDietyRankingLoading}
                onItemClick={onShowDiety}
                maxItems={3}
              />
            </div>
          </Col>
        </Row>

        {/* 称号 */}
        {titles.length > 0 && (
          <Row className="mb-3">
            <Col xs={12}>
              <div className="modal-section">
                <div className="modal-subtitle">{t('titles')}</div>
                <ul className="list-unstyled">
                  {titles.map(t => {
                    return (
                      <li key={t.id} style={{ whiteSpace: 'nowrap' }}>
                        <AwardIcon grade={t.grade} embed_data={t.embed_data} /> {t.template && t.embed_data ? (
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
                                    <span key={idx} style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>
                                      {t.embed_data?.period}
                                    </span>
                                  );
                                }
                                // 他の埋め込みデータもそのまま表示
                                return t.embed_data?.[key] || '';
                              }
                              return part;
                            })}
                          </span>
                        ) : t.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Col>
          </Row>
        )}

        {/* モーダル */}
        <FollowModal
          isOpen={showFollowingModal}
          onClose={() => setShowFollowingModal(false)}
          title={t('followingUsers')}
          users={followingUsers || []}
          isLoading={isFollowingLoading}
          error={followingError?.message || null}
          onUserClick={onShowUser}
        />
        <FollowModal
          isOpen={showFollowerModal}
          onClose={() => setShowFollowerModal(false)}
          title={t('followers')}
          users={followerUsers || []}
          isLoading={isFollowersLoading}
          error={followersError?.message || null}
          onUserClick={onShowUser}
        />
      </Container>
    );
  }
);

export default UserPane;
