import CustomLink from '../atoms/CustomLink';

export default function MenuPane() {
  return (
    <nav className="p-2 bg-gray-200 flex space-x-4 fixed bottom-0 left-0 right-0 justify-around">
      <CustomLink to="/">地図</CustomLink>
      <CustomLink to="/catalog">図鑑</CustomLink>
      <CustomLink to="/user">ユーザー</CustomLink>
      <CustomLink to="/settings">設定</CustomLink>
    </nav>
  );
}
