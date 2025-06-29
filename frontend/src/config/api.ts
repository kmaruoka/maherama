// 環境変数のチェック
if (!import.meta.env.VITE_API_PORT) {
  throw new Error('VITE_API_PORT環境変数が設定されていません。例: VITE_API_PORT=3001');
}

const API_PORT = import.meta.env.VITE_API_PORT;
export const API_BASE = `http://localhost:${API_PORT}`; 