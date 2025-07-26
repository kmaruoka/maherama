import { useState } from 'react';
import CustomMenuItem from '../atoms/CustomMenuItem';
import { useSkin } from '../../skins/SkinContext';
import { useTranslation } from 'react-i18next';

export default function MenuPane({ setPage, page, isDialogOpen }: { setPage: (page: 'map' | 'catalog' | 'user' | 'settings') => void, page: 'map' | 'catalog' | 'user' | 'settings', isDialogOpen?: boolean }) {
  useSkin();
  const { t } = useTranslation();
  
  // 最後に選択したメニューを記憶する状態
  const [lastSelectedMenu, setLastSelectedMenu] = useState<'map' | 'catalog' | 'user' | 'settings'>(page);
  
  const handleNavClick = (e: React.MouseEvent) => {
    // メニュー以外の場所をクリックしてもページ状態を変更しないようにする
    e.stopPropagation();
  };

  const handleMenuItemClick = (menuPage: 'map' | 'catalog' | 'user' | 'settings') => {
    setPage(menuPage);
    setLastSelectedMenu(menuPage);
  };

  return (
    <nav
      className={`menu-pane d-flex border-top${page === 'catalog' ? ' menu-pane-catalog' : ''}${isDialogOpen ? ' menu-pane--dialog-open' : ''}`}
      style={{ 
        background: 'var(--color-surface)', 
        borderColor: 'var(--color-border)', 
      }}
      onClick={handleNavClick}
    >
      <CustomMenuItem onClick={() => handleMenuItemClick('map')} active={lastSelectedMenu === 'map'}>{t('map')}</CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('catalog')} active={lastSelectedMenu === 'catalog'}>{t('catalog')}</CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('user')} active={lastSelectedMenu === 'user'}>{t('user')}</CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('settings')} active={lastSelectedMenu === 'settings'}>{t('settings')}</CustomMenuItem>
    </nav>
  );
}
