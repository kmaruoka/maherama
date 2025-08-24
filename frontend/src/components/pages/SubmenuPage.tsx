import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useSkin } from '../../skins/SkinContext';
import PageTitle from '../atoms/PageTitle';
import './SubmenuPage.css';

interface SubmenuPageProps {
  onNavigateToTerms?: () => void;
  onNavigateToCommercialTransaction?: () => void;
}

export default function SubmenuPage({ onNavigateToTerms, onNavigateToCommercialTransaction }: SubmenuPageProps) {
  const { t } = useTranslation();
  useSkin();

  return (
    <div className="submenu-page">
      <div className="submenu-page__content">
        <PageTitle title="メニュー" />
        <div className="submenu-page__items">
          {/* 利用規約と特定商取引に基づく表記へのリンク */}
          {onNavigateToTerms && (
            <div className="submenu-page__item">
              <Button
                variant="link"
                onClick={onNavigateToTerms}
                className="submenu-page__link"
              >
                利用規約
              </Button>
            </div>
          )}
          {onNavigateToCommercialTransaction && (
            <div className="submenu-page__item">
              <Button
                variant="link"
                onClick={onNavigateToCommercialTransaction}
                className="submenu-page__link"
              >
                特定商取引に基づく表記
              </Button>
            </div>
          )}
          <div className="submenu-page__item">
            <Button
              variant="link"
              onClick={() => {
                // 通知モーダルを開く処理
                const event = new CustomEvent('openNotificationModal');
                window.dispatchEvent(event);
              }}
              className="submenu-page__link"
            >
              お知らせ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
