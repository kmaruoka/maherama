import CustomLink from '../atoms/CustomLink';

export default function MenuPane() {
  return (
    <nav className="bg-gray-200 flex fixed bottom-0 left-0 right-0 divide-x divide-gray-300">
      <CustomLink className="flex-1 py-2 text-center block" to="/">
        地図
      </CustomLink>
      <CustomLink className="flex-1 py-2 text-center block" to="/catalog">
        図鑑
      </CustomLink>
      <CustomLink className="flex-1 py-2 text-center block" to="/user">
        ユーザー
      </CustomLink>
      <CustomLink className="flex-1 py-2 text-center block" to="/settings">
        設定
      </CustomLink>
    </nav>
  );
}
