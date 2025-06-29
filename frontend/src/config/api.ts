// 環境変数のチェック
if (!import.meta.env.PORT) {
  throw new Error('PORT環境変数が設定されていません。.envファイルにPORT=3000を追加してください');
}

const API_PORT = import.meta.env.PORT;
export const API_BASE = `http://localhost:${API_PORT}`; 