import CustomMenuItem from '../atoms/CustomMenuItem';

export default function MenuPane({ setPage }: { setPage: (page: 'map' | 'catalog' | 'user' | 'settings') => void }) {
  return (
    <nav className="bg-gray-200 flex fixed bottom-0 left-0 right-0 divide-x divide-gray-300">
      <CustomMenuItem onClick={() => setPage('map')}>地図</CustomMenuItem>
      <CustomMenuItem onClick={() => setPage('catalog')}>図鑑</CustomMenuItem>
      <CustomMenuItem onClick={() => setPage('user')}>ユーザー</CustomMenuItem>
      <CustomMenuItem onClick={() => setPage('settings')}>設定</CustomMenuItem>
    </nav>
  );
}
