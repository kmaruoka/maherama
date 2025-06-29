import CustomMenuItem from '../atoms/CustomMenuItem';

export default function MenuPane() {
  return (
    <nav className="bg-gray-200 flex fixed bottom-0 left-0 right-0 divide-x divide-gray-300">
      <CustomMenuItem to="/">地図</CustomMenuItem>
      <CustomMenuItem to="/catalog">図鑑</CustomMenuItem>
      <CustomMenuItem to="/user">ユーザー</CustomMenuItem>
      <CustomMenuItem to="/settings">設定</CustomMenuItem>
    </nav>
  );
}
