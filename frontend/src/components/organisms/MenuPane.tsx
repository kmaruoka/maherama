import CustomMenuItem from '../atoms/CustomMenuItem';
import { useSkin } from '../../skins/SkinContext';

export default function MenuPane({ setPage }: { setPage: (page: 'map' | 'catalog' | 'user' | 'settings') => void }) {
  useSkin();
  return (
    <nav
      className="d-flex position-fixed bottom-0 start-0 end-0 border-top"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <CustomMenuItem onClick={() => setPage('map')}>地図</CustomMenuItem>
      <CustomMenuItem onClick={() => setPage('catalog')}>図鑑</CustomMenuItem>
      <CustomMenuItem onClick={() => setPage('user')}>ユーザー</CustomMenuItem>
      <CustomMenuItem onClick={() => setPage('settings')}>設定</CustomMenuItem>
    </nav>
  );
}
