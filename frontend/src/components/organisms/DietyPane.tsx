import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCompressAlt, FaExpandAlt } from 'react-icons/fa';
import { NOIMAGE_DIETY_URL } from '../../constants';
import { useModal } from '../../contexts/ModalContext';
import { useDietyDetail } from '../../hooks/useDietyDetail';
import { useSkin } from '../../skins/SkinContext';
import CustomLink from '../atoms/CustomLink';

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

const DietyPane = forwardRef<DietyPaneRef, DietyPaneProps>(
  ({ id, onShowShrine, onShowUser, onClose, onDetailViewChange }, ref) => {
    const { t } = useTranslation();
    const [detailView, setDetailView] = useState<DetailViewType>('overview');
    const { updateCurrentModalName } = useModal();

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

    const { skin } = useSkin();

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

    if (isLoading) {
      return <div className="p-3">{t('loading')}</div>;
    }

    if (error || !diety) {
      return <div className="p-3">{t('dietyNotFound')}</div>;
    }

    // 型安全なサムネイル取得（mサイズを優先、次にsサイズ）
    const dietyImageUrl = (diety as { image_url_m?: string; image_url_s?: string; image_url?: string } | undefined)?.image_url_m || (diety as { image_url_s?: string; image_url?: string } | undefined)?.image_url_s || (diety as { image_url?: string } | undefined)?.image_url || NOIMAGE_DIETY_URL;

    // 拡大表示用のLサイズ画像URL
    const dietyLargeImageUrl = (diety as { image_url_l?: string; image_url_m?: string; image_url_s?: string; image_url?: string } | undefined)?.image_url_l || (diety as { image_url_m?: string; image_url_s?: string; image_url?: string } | undefined)?.image_url_m || (diety as { image_url_s?: string; image_url?: string } | undefined)?.image_url_s || (diety as { image_url?: string } | undefined)?.image_url || NOIMAGE_DIETY_URL;

    // 詳細表示のレンダリング関数
    const renderDetailContent = () => {
      if (detailView === 'thumbnail') {
        return (
          <img
            src={dietyLargeImageUrl}
            alt="神様サムネイル"
            style={{ width: '100%', height: 'auto', maxHeight: '100%', objectFit: 'contain' }}
          />
        );
      } else if (detailView === 'description') {
        return (
          <>
            <div className="modal-subtitle">
              {t('description')}
              <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
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
              <FaCompressAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
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
        }} style={{ cursor: 'pointer', padding: 0, margin: 0, minHeight: '100%' }}>
          {renderDetailContent()}
        </div>
      );
    }

    return (
      <div>
        <div className="pane__header">
          <div className="pane__thumbnail" onClick={(e) => {
            // ボタンがクリックされた場合は画像表示切り替えを行わない
            if ((e.target as HTMLElement).closest('button')) {
              return;
            }
            setDetailView('thumbnail');
          }} style={{ cursor: 'pointer' }}>
            <img
              src={dietyImageUrl}
              alt="神様サムネイル"
              className="pane__thumbnail-img"
            />
          </div>
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
        </div>

        <div className="modal-section">
          <div className="modal-subtitle" onClick={() => setDetailView('shrine-ranking')} style={{ cursor: 'pointer' }}>
            {t('enshrinedShrines')}
            <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
          </div>
          <div className="d-flex flex-wrap gap-2">
            {diety.shrines && diety.shrines.length > 0 ? (
              diety.shrines.slice(0, 3).map(shrine => (
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

        {diety.description && (
          <div className="modal-section">
            <div className="modal-subtitle" onClick={() => setDetailView('description')} style={{ cursor: 'pointer' }}>
              {t('description')}
              <FaExpandAlt size={16} style={{ marginLeft: '8px', opacity: 0.7 }} />
            </div>
            <div className="description-preview">
              <p className="text-body-secondary small">{diety.description}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default DietyPane;
