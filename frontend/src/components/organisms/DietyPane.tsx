import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCompressAlt, FaExpandAlt } from 'react-icons/fa';
import { apiCall } from '../../config/api';
import { NOIMAGE_DIETY_URL } from '../../constants';
import { useModal } from '../../contexts/ModalContext';
import { useDietyDetail } from '../../hooks/useDietyDetail';
import { useImageManagement } from '../../hooks/useImageManagement';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useSkin } from '../../skins/SkinContext';
import { formatDisplayDate } from '../../utils/dateFormat';
import CustomLink from '../atoms/CustomLink';
import SizedThumbnailImage from '../atoms/SizedThumbnailImage';
import { ImageUploadModal } from '../molecules/ImageUploadModal';
import type { Period } from './RankingPane';
import RankingPane from './RankingPane';

interface DietyPaneProps {
  id?: number;
  onShowShrine?: (id: number) => void;
  onShowUser?: (id: number) => void;
  onClose?: () => void;
  onDetailViewChange?: (detailView: DetailViewType) => void;
}

type DetailViewType = 'overview' | 'thumbnail' | 'description' | 'shrine-ranking';

export interface DietyPaneRef {
  backToOverview: () => void;
  getTitle: () => string;
}

// 神様のユーザーランキング用フック
function useDietyUserRankingsBundle(dietyId: number | undefined, refreshKey: number): { data: { [key in Period]: { id: number; name: string; count: number; rank: number; }[] }, isLoading: boolean } {
  const [data, setData] = useState<{ [key in Period]: { id: number; name: string; count: number; rank: number; }[] }>({ all: [], yearly: [], monthly: [], weekly: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!dietyId) return;
    setLoading(true);
    apiCall(`/api/diety-rankings-bundle?dietyId=${dietyId}`)
      .then(res => res.json())
      .then(json => setData(json))
      .finally(() => setLoading(false));
  }, [dietyId, refreshKey]);
  return { data, isLoading: loading };
}

// ランキングデータの変換関数
function convertUserRankingsByPeriod(userRankingsByPeriod: { [key in Period]: { id: number; name: string; count: number; rank: number; }[] }) {
  const periods: Period[] = ['all', 'yearly', 'monthly', 'weekly'];
  const result: { [key in Period]: { id: number; name: string; count: number; rank: number; }[] } = { all: [], yearly: [], monthly: [], weekly: [] };

  for (const period of periods) {
    result[period] = userRankingsByPeriod[period].map(item => ({
      id: item.id,
      name: item.name,
      count: item.count,
      rank: item.rank
    }));
  }

  return result;
}

const DietyPane = forwardRef<DietyPaneRef, DietyPaneProps>(
  ({ id, onShowShrine, onShowUser, onClose, onDetailViewChange }, ref) => {
    const { t } = useTranslation();
    const [detailView, setDetailView] = useState<DetailViewType>('overview');
    const [rankRefreshKey, setRankRefreshKey] = useState(0);
    const { updateCurrentModalName } = useModal();
    const [userId] = useLocalStorageState<number | null>('userId', null);
    const [imageCache, setImageCache] = useState(Date.now());

    // detailViewが変更されたときに親コンポーネントに通知
    useEffect(() => {
      onDetailViewChange?.(detailView);
    }, [detailView, onDetailViewChange]);

    const {
      data: diety,
      isLoading,
      error,
      refetch
    } = useDietyDetail(id);

    // ランキングデータを取得
    const { data: userRankingsByPeriod, isLoading: isRankingLoading } = useDietyUserRankingsBundle(id, rankRefreshKey);

    const { skin } = useSkin();

    // 画像管理フックを使用
    const [imageState, imageActions] = useImageManagement({
      entityType: 'diety',
      entityId: id || 0,
      userId: userId || undefined,
      noImageUrl: NOIMAGE_DIETY_URL,
      queryKeys: ['diety', String(id), 'diety-list'],
      relatedQueryKeys: [
        ['diety-list'],
        ['diety', String(id || 0)]
      ]
    });

    // データ取得後にgetTitleメソッドを更新
    useEffect(() => {
      if (diety?.name) {
        const title = diety.kana ? `${diety.name}(${diety.kana})` : diety.name;
        updateCurrentModalName(title);
      }
    }, [diety?.name, diety?.kana, updateCurrentModalName]);

    // refで外部から呼び出せるメソッドを定義
    useImperativeHandle(ref, () => ({
      backToOverview: () => setDetailView('overview'),
      getTitle: () => {
        if (!diety?.name) return '';
        return diety.kana ? `${diety.name}(${diety.kana})` : diety.name;
      }
    }));

    // アップロード後のデータ再取得
    useEffect(() => {
      if (imageState.thumbCache > 0 && refetch) {
        refetch().then(() => {
          // データ更新後にimageCacheを更新
          setImageCache(Date.now());
        }).catch((error) => {
          console.error('DietyPane: Data refetch failed:', error);
        });
      }
    }, [imageState.thumbCache, refetch]);

    // 画像URLが変更された時にimageCacheを更新
    useEffect(() => {
      if (diety?.image_url_s || diety?.image_url_m || diety?.image_url_l || diety?.image_url) {
        setImageCache(Date.now());
      }
    }, [diety?.image_url_s, diety?.image_url_m, diety?.image_url_l, diety?.image_url]);

    const handleUpload = async (file: File) => {
      if (!id) {
        console.error('神様IDが指定されていません');
        return;
      }
      await imageActions.handleUpload(file);
      setRankRefreshKey(prev => prev + 1);

      // アップロード後にデータを再取得
      if (refetch) {
        await refetch();
      }
    };

    if (isLoading) {
      return <div className="p-3">{t('loading')}</div>;
    }

    if (error || !diety) {
      return <div className="p-3">{t('dietyNotFound')}</div>;
    }

    // 画像管理フックから画像URLを取得
    const dietyImageUrl = imageState.currentImageUrl || NOIMAGE_DIETY_URL;
    const dietyLargeImageUrl = imageState.currentImageUrl || NOIMAGE_DIETY_URL;

    // 詳細表示のレンダリング関数
    const renderDetailContent = () => {
      if (detailView === 'thumbnail') {
        return (
          <div className="expanded-thumbnail-container">
            <SizedThumbnailImage
              key={`diety-detail-${id}-${imageCache}`}
              size="l"
              alt="神様サムネイル"
              noImageUrl={NOIMAGE_DIETY_URL}
              expanded={true}
              images={{
                l: diety.image_url_l
              }}
              shouldUseFallback={imageState.shouldUseFallback}
              cacheKey={imageCache}
            />
          </div>
        );
      } else if (detailView === 'description') {
        return (
          <>
            <div className="modal-subtitle">
              {t('historyAndLegend')}
              <FaCompressAlt size={16} className="margin-left-8 opacity-7" />
            </div>
            <div className="description-full">
              <p className="text-body-secondary">{diety.description}</p>
            </div>
          </>
        );
      } else if (detailView === 'shrine-ranking') {
        return (
          <>
            <div className="modal-subtitle">
              {t('enshrinedShrines')}
              {diety.shrines && diety.shrines.length > 0 && (
                <span className="margin-left-8 opacity-7">({diety.shrines.length})</span>
              )}
              <FaCompressAlt size={16} className="margin-left-8 opacity-7" />
            </div>
            <div className="d-flex flex-wrap gap-2">
              {diety.shrines && diety.shrines.length > 0 ? (
                diety.shrines.map(shrine => (
                  <CustomLink
                    key={shrine.id}
                    onClick={() => onShowShrine && onShowShrine(shrine.id)}
                    type="shrine"
                  >
                    {shrine.name}
                  </CustomLink>
                ))
              ) : (
                <span className="text-muted">{t('noShrineInfo')}</span>
              )}
            </div>
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
        }} className="cursor-pointer detail-view-container">
          {renderDetailContent()}
        </div>
      );
    }

    return (
      <Container fluid>
        {/* ヘッダー部分：サムネイルと情報を横並び */}
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <SizedThumbnailImage
              key={`diety-${id}-${imageCache}`}
              alt="神様サムネイル"
              noImageUrl={NOIMAGE_DIETY_URL}
              responsive={true}
              responsiveConfig={{
                breakpoints: [
                  { minWidth: 768, size: 'm' },   // タブレット以上: Mサイズ
                  { maxWidth: 767, size: 's' }    // スマホ以下: Sサイズ
                ],
                defaultSize: 's'
              }}
              images={{
                s: diety.image_url_s,
                m: diety.image_url_m
              }}
              loadingText="読み込み中..."
              shouldUseFallback={imageState.shouldUseFallback}
              cacheKey={imageCache}
              upload={{
                onUploadClick: () => imageActions.setIsUploadModalOpen(true),
                showUploadButton: !!id
              }}
              userInfo={{
                imageBy: diety.image_by,
                imageByUserId: (diety as any).image_by_user_id,
                onShowUser: onShowUser
              }}
              actions={{
                onClick: () => setDetailView('thumbnail')
              }}
            />
          </Col>
          <Col xs={12} md={6}>
          </Col>
        </Row>

        {/* 説明 */}
        {diety.description && (
          <Row className="mb-3">
            <Col xs={12}>
              <div className="description-preview cursor-pointer" onClick={() => setDetailView('description')}>
                <p>{diety.description}</p>
              </div>
            </Col>
          </Row>
        )}

        {/* 祭神 */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('shrine-ranking')}>
              {t('enshrinedShrines')}
              {diety.shrines && diety.shrines.length > 0 && (
                <span className="margin-left-8 opacity-7">({diety.shrines.length})</span>
              )}
              <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
            </div>
            <div className="d-flex flex-wrap gap-2">
              {diety.shrines && diety.shrines.length > 0 ? (
                diety.shrines.slice(0, 10).map(shrine => (
                  <CustomLink
                    key={shrine.id}
                    onClick={() => onShowShrine && onShowShrine(shrine.id)}
                    type="shrine"
                  >
                    {shrine.name}
                  </CustomLink>
                ))
              ) : (
                <span className="text-muted">{t('noShrineInfo')}</span>
              )}
            </div>
          </Col>
        </Row>



        {/* ランキング */}
        <Row className="mb-3">
          <Col xs={12}>
            <RankingPane
              itemsByPeriod={convertUserRankingsByPeriod(userRankingsByPeriod)}
              type="user"
              rankingType="diety"
              isLoading={isRankingLoading}
              onItemClick={onShowUser}
              maxItems={100}
            />
          </Col>
        </Row>

        {/* 参拝数、図鑑収録日と最終参拝日 */}
        <Row>
          <Col xs={12}>
            <div className="modal-section">
              <div className="field-row">
                <span className="field-row__label">{t('count')}:</span>
                <span className="field-row__value">{diety.count}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">{t('catalogedAt')}:</span>
                <span className="field-row__value">{diety.catalogedAt ? formatDisplayDate(diety.catalogedAt) : t('notRegistered')}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">{t('lastPrayedAt')}:</span>
                <span className="field-row__value">{diety.lastPrayedAt ? formatDisplayDate(diety.lastPrayedAt) : t('notRegistered')}</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* モーダル */}
        <ImageUploadModal
          isOpen={imageState.isUploadModalOpen}
          onClose={() => imageActions.setIsUploadModalOpen(false)}
          onUpload={handleUpload}
          title={`${diety?.name || '神様'}の画像をアップロード`}
        />
      </Container>
    );
  }
);

export default DietyPane;
