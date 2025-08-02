import { useTranslation } from 'react-i18next';
import { useSkin } from '../../skins/SkinContext';

export default function SubmenuPage() {
  const { t } = useTranslation();
  useSkin();

  return (
    <div className="submenu-page">
      <div className="submenu-page__content">
        <h2 className="submenu-page__title">{t('submenu')}</h2>
        <div className="submenu-page__items">
          {/* サブメニューの項目をここに追加 */}
          <div className="submenu-page__item">
            <p>サブメニュー項目1</p>
          </div>
          <div className="submenu-page__item">
            <p>サブメニュー項目2</p>
          </div>
          <div className="submenu-page__item">
            <p>サブメニュー項目3</p>
          </div>
        </div>
      </div>
    </div>
  );
} 