// API_BASEの設定
const getApiBase = () => {
  // 開発環境またはローカル環境
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const port = import.meta.env.VITE_PORT || '3000';
    return `http://localhost:${port}`;
  }

  // 本番環境（同じサーバー）
  const protocol = window.location.protocol;
  return `${protocol}//${window.location.hostname}/api`;
};

export const API_BASE = getApiBase();

export const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

// ローカルストレージからユーザーIDを取得する関数
function getUserId(): number | null {
  if (typeof window !== 'undefined') {
    const v = localStorage.getItem('userId');
    if (v === null) {
      return null;
    }
    try {
      const parsed = Number(v);
      return isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }
  return null;
}

// 認証ヘッダーを自動的に追加するAPI呼び出し関数
export async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const userId = getUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 認証ヘッダーを追加（userIdがnullでない場合のみ）
  if (userId !== null) {
    headers['x-user-id'] = String(userId);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // エラーレスポンスの場合は詳細をログに出力
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error ${response.status}:`, errorText);
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response;
}
