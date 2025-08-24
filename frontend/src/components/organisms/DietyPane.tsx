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
import CustomLink from '../atoms/CustomLink';
import { ThumbnailImage } from '../atoms/ThumbnailImage';
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

    useEffect(() => {
      if (diety?.image_url || diety?.image_url_m || diety?.image_url_s || diety?.image_url_l) {
        // データが更新されたら画像状態をリセット
        imageActions.resetImageState();

        // 画像URLの存在確認を行う（Lサイズを優先、次にMサイズ、Sサイズ、オリジナル）
        const imageUrl = diety.image_url_l || diety.image_url_m || diety.image_url_s || diety.image_url;
        if (imageUrl && imageUrl !== NOIMAGE_DIETY_URL) {
          imageActions.handleImageUrlChange(imageUrl);
        }
      }
    }, [diety?.image_url, diety?.image_url_m, diety?.image_url_s, diety?.image_url_l, imageActions]);

    const handleUpload = async (file: File) => {
      if (!id) {
        console.error('神様IDが指定されていません');
        return;
      }
      await imageActions.handleUpload(file);
      setRankRefreshKey(prev => prev + 1);
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
          <ThumbnailImage
            src={dietyLargeImageUrl}
            alt="神様サムネイル"
            fallbackSrc={NOIMAGE_DIETY_URL}
            className="width-100 height-auto max-height-100 object-fit-contain"
            shouldUseFallback={imageState.shouldUseFallback}
            cacheKey={imageState.thumbCache}
          />
        );
      } else if (detailView === 'description') {
        return (
          <>
            <div className="modal-subtitle">
              {t('description')}
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
        }} className="cursor-pointer">
          {renderDetailContent()}
        </div>
      );
    }

    return (
      <Container fluid>
        {/* ヘッダー部分：サムネイルと情報を横並び */}
        <Row className="mb-3">
          <Col xs={12} md={4}>
            <ThumbnailImage
              src={dietyImageUrl}
              alt="神様サムネイル"
              fallbackSrc={NOIMAGE_DIETY_URL}
              loadingText="読み込み中..."
              shouldUseFallback={imageState.shouldUseFallback}
              onUploadClick={() => imageActions.setIsUploadModalOpen(true)}
              showUploadButton={!!id}
              imageBy={diety.image_by}
              imageByUserId={(diety as any).image_by_user_id}
              onShowUser={onShowUser}
              onClick={() => setDetailView('thumbnail')}
              cacheKey={imageState.thumbCache}
            />
          </Col>
          <Col xs={12} md={8}>
            <div className="pane__info">
              <div className="pane__title">{diety.name}</div>
              {diety.kana && <div className="pane__kana">{diety.kana}</div>}
              <div className="pane__meta">
                <div className="field-row">
                  <span className="field-row__label">{t('description')}:</span>
                  <span className="field-row__value">{diety.description || t('noDescription')}</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">{t('count')}:</span>
                  <span className="field-row__value">{diety.count}</span>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* 祭神 */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="modal-section">
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
            </div>
          </Col>
        </Row>

        {/* 説明 */}
        {diety.description && (
          <Row className="mb-3">
            <Col xs={12}>
              <div className="modal-section">
                <div className="modal-subtitle cursor-pointer" onClick={() => setDetailView('description')}>
                  {t('description')}
                  <FaExpandAlt size={16} className="margin-left-8 opacity-7" />
                </div>
                <div className="description-preview">
                  <p className="text-body-secondary small">{diety.description}</p>
                </div>
              </div>
            </Col>
          </Row>
        )}

        {/* ランキング */}
        <Row>
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
