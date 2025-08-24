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
import CustomLink from '../atoms/CustomLink';
import { AwardIcon } from '../atoms/CustomText';
import PageTitle from '../atoms/PageTitle';
import { ThumbnailImage } from '../atoms/ThumbnailImage';
import FollowModal from '../molecules/FollowModal';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import RankingPane from './RankingPane';

interface MyPageProps {
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
  onClose?: () => void;
}

type DetailViewType = 'overview' | 'shrine-ranking' | 'diety-ranking';

export interface MyPageRef {
  backToOverview: () => void;
  getTitle: () => string;
}

const MyPage = forwardRef<MyPageRef, MyPageProps>(
  ({ onShowShrine, onShowDiety, onShowUser, onClose }, ref) => {
    const { t } = useTranslation();
    const [currentUserId] = useLocalStorageState<number | null>('userId', null);
    const [detailView, setDetailView] = useState<DetailViewType>('overview');
    const { updateCurrentModalName } = useModal();

    // currentUserIdがnullの場合は早期リターン
    if (!currentUserId) {
      return <div className="p-3">{t('userIdNotSpecified')}</div>;
    }

    const {
      data: userInfo,
      isLoading,
      refetch,
    } = useUserInfo(currentUserId, currentUserId);

    const { data: titles = [] } = useUserTitles(currentUserId);
    const { data: levelInfo } = useLevelInfo(currentUserId);

    const { data: userShrineRankingsByPeriod, isLoading: isUserShrineRankingLoading } = useUserShrineRankings(currentUserId);
    const { data: userDietyRankingsByPeriod, isLoading: isUserDietyRankingLoading } = useUserDietyRankings(currentUserId);

    const { data: followingUsers, isLoading: isFollowingLoading, error: followingError, refetch: refetchFollowing } = useFollowing(currentUserId);
    const { data: followerUsers, isLoading: isFollowersLoading, error: followersError, refetch: refetchFollowers } = useFollowers(currentUserId);

    const { skin } = useSkin();

    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [showFollowerModal, setShowFollowerModal] = useState(false);

    // 画像管理フックを使用
    const [imageState, imageActions] = useImageManagement({
      entityType: 'user',
      entityId: currentUserId,
      userId: currentUserId,
      noImageUrl: NOIMAGE_USER_URL,
      queryKeys: ['user', String(currentUserId), 'user-info']
    });

    // refで外部から呼び出せるメソッドを定義
    useImperativeHandle(ref, () => ({
      backToOverview: () => {}, // MyPageでは詳細表示がないため空実装
      getTitle: () => userInfo?.name || ''
    }));

    useEffect(() => {
      if (userInfo?.image_url || userInfo?.image_url_m || userInfo?.image_url_s || userInfo?.image_url_l) {
        // データが更新されたら画像状態をリセット
        imageActions.resetImageState();

        // 画像URLの存在確認を行う
        const imageUrl = userInfo.image_url_l || userInfo.image_url_m || userInfo.image_url || userInfo.image_url_s;
        if (imageUrl && imageUrl !== NOIMAGE_USER_URL) {
          imageActions.handleImageUrlChange(imageUrl);
        }
      }
    }, [userInfo?.image_url, userInfo?.image_url_m, userInfo?.image_url_s, userInfo?.image_url_l]);

    const handleUpload = async (file: File) => {
      await imageActions.handleUpload(file);
      refetch();
    };

    const handleFollow = async () => {
      if (!userInfo) return;
      await apiCall(`/follows`, {
        method: 'POST',
        body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
      });
      refetch();
      refetchFollowing();
      refetchFollowers();
    };

    const handleUnfollow = async () => {
      if (!userInfo) return;
      await apiCall(`/follows`, {
        method: 'DELETE',
        body: JSON.stringify({ followerId: currentUserId, followingId: userInfo.id }),
      });
      refetch();
      refetchFollowing();
      refetchFollowers();
    };

    if (isLoading) {
      return <div className="p-3">{t('loading')}</div>;
    }

    if (!userInfo) {
      return <div className="p-3">{t('userNotFound')}</div>;
    }

    // 型安全なサムネイル取得（mサイズを優先、次にsサイズ）
    const userImageUrl = (userInfo as { image_url_m?: string; image_url_s?: string; image_url?: string } | undefined)?.image_url_m || (userInfo as { image_url_s?: string; image_url?: string } | undefined)?.image_url_s || (userInfo as { image_url?: string } | undefined)?.image_url || NOIMAGE_USER_URL;

    // 詳細表示のレンダリング関数
    const renderDetailContent = () => {
      if (detailView === 'shrine-ranking') {
        return (
          <>
            <div className="modal-subtitle">
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
          </>
        );
      } else if (detailView === 'diety-ranking') {
        return (
          <>
            <div className="modal-subtitle">
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
          </>
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
        }} style={{ cursor: 'pointer', padding: 0, margin: 0, minHeight: '100%' }}>
          {renderDetailContent()}
        </div>
      );
    }

    return (
      <div>
        <PageTitle title="プロフィール" />
        <Container fluid className="pane__header">
          <Row>
            <Col md={3} className="pane__thumbnail">
              <ThumbnailImage
                src={(userImageUrl) + (imageState.thumbCache > 0 ? '?t=' + imageState.thumbCache : '')}
                alt="ユーザーサムネイル"
                fallbackSrc={NOIMAGE_USER_URL}
                className="pane__thumbnail-img"
                loadingText="読み込み中..."
                shouldUseFallback={imageState.shouldUseFallback}
                onUploadClick={() => imageActions.setIsUploadModalOpen(true)}
                showUploadButton={true}
              />
            </Col>
            <Col md={9} className="pane__info">
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
                <span className="pane__follow" onClick={() => setShowFollowingModal(true)}>{t('following')}: {userInfo.following_count}</span>
                <span className="pane__follow" onClick={() => setShowFollowerModal(true)}>{t('followers')}: {userInfo.follower_count}</span>
              </div>
            </Col>
          </Row>
        </Container>

        <Container fluid className="modal-section">
          <Row>
            <Col md={12} onClick={() => setDetailView('shrine-ranking')} style={{ cursor: 'pointer' }}>
              <div className="modal-subtitle">
                {t('oftenPrayedShrines')}
                <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
              </div>
              <RankingPane
                itemsByPeriod={userShrineRankingsByPeriod}
                type="shrine"
                isLoading={isUserShrineRankingLoading}
                onItemClick={onShowShrine}
                maxItems={3}
              />
            </Col>
          </Row>
        </Container>
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
        <Container fluid className="modal-section">
          <Row>
            <Col md={12} onClick={() => setDetailView('diety-ranking')} style={{ cursor: 'pointer' }}>
              <div className="modal-subtitle">
                {t('oftenPrayedDeities')}
                <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
              </div>
              <RankingPane
                itemsByPeriod={userDietyRankingsByPeriod}
                type="diety"
                isLoading={isUserDietyRankingLoading}
                onItemClick={onShowDiety}
                maxItems={3}
              />
            </Col>
          </Row>
        </Container>

        {titles.length > 0 && (
          <Container fluid className="mt-4">
            <Row>
              <Col md={12}>
                <div className="modal-subtitle">{t('titles')}</div>
                <ul className="list-unstyled">
                  {titles.map(t => {
                    // デバッグ用ログ
                    console.log('MyPage TrophyIcon debug', { grade: t.grade, embed_data: t.embed_data, name: t.embed_data?.name, shrine: t.embed_data?.shrine, diety: t.embed_data?.diety });
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
              </Col>
            </Row>
          </Container>
        )}

        {/* モーダル */}
        <ImageUploadModal
          isOpen={imageState.isUploadModalOpen}
          onClose={() => imageActions.setIsUploadModalOpen(false)}
          onUpload={handleUpload}
          title={`${userInfo?.name || 'ユーザー'}の画像をアップロード`}
        />
      </div>
    );
  }
);

export default MyPage;
