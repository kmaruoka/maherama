import { useState } from 'react';
import CustomMenuItem from '../atoms/CustomMenuItem';
import { useSkin } from '../../skins/SkinContext';
import { useTranslation } from 'react-i18next';
import { FaMapLocationDot, FaBook, FaUser, FaGear, FaBars, FaFlag } from "react-icons/fa6";

export default function MenuPane({ setPage, page, isDialogOpen }: { setPage: (page: 'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission') => void, page: 'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission', isDialogOpen?: boolean }) {
  useSkin();
  const { t } = useTranslation();
  
  // 最後に選択したメニューを記憶する状態
  const [lastSelectedMenu, setLastSelectedMenu] = useState<'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission'>(page);
  
  const handleNavClick = (e: React.MouseEvent) => {
    // メニュー以外の場所をクリックしてもページ状態を変更しないようにする
    e.stopPropagation();
  };

  const handleMenuItemClick = (menuPage: 'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission') => {
    setPage(menuPage);
    setLastSelectedMenu(menuPage);
  };

  return (
    <nav
      className={`menu-pane d-flex${page === 'catalog' ? ' menu-pane-catalog' : ''}${isDialogOpen ? ' menu-pane--dialog-open' : ''}`}
      style={{ 
        background: 'var(--color-surface)', 
        borderColor: 'var(--color-border)', 
      }}
      onClick={handleNavClick}
    >
      <CustomMenuItem onClick={() => handleMenuItemClick('map')} active={lastSelectedMenu === 'map'}>
        <FaMapLocationDot />
      </CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('catalog')} active={lastSelectedMenu === 'catalog'}>
        <FaBook />
      </CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('user')} active={lastSelectedMenu === 'user'}>
        <FaUser />
      </CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('settings')} active={lastSelectedMenu === 'settings'}>
        <FaGear />
      </CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('submenu')} active={lastSelectedMenu === 'submenu'}>
        <FaBars />
      </CustomMenuItem>
      <CustomMenuItem onClick={() => handleMenuItemClick('mission')} active={lastSelectedMenu === 'mission'}>
        <FaFlag />
      </CustomMenuItem>
    </nav>
  );
}
