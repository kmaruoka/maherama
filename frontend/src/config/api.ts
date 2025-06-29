// 環境変数のチェック
if (!import.meta.env.VITE_PORT) {
  throw new Error('VITE_PORT環境変数が設定されていません。.envファイルにVITE_PORT=3000を追加してください');
}

// API_BASEの設定
const getApiBase = () => {
  // 開発環境
  if (import.meta.env.DEV) {
    if (import.meta.env.VITE_PORT) {
      return `http://localhost:${import.meta.env.VITE_PORT}`;
    }
    return 'http://localhost:3000'; // デフォルト
  }
  
  // 本番環境（同じサーバー）
  // フロントエンドが静的ファイルとして配信される場合、
  // APIは同じホストの別ポートで動く
  const port = import.meta.env.VITE_API_PORT || '3000';
  return `http://${window.location.hostname}:${port}`;
};

export const API_BASE = getApiBase(); 