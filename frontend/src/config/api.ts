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

// Mapbox API Key
export const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

// セキュアなトークン管理
class SecureTokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'user_data';

  // トークンを安全に保存（HttpOnly Cookieの代替として）
  static setToken(token: string): void {
    try {
      // トークンを暗号化して保存（簡易的な実装）
      const encryptedToken = btoa(token); // Base64エンコード（本番ではより強力な暗号化を使用）
      sessionStorage.setItem(this.TOKEN_KEY, encryptedToken);
    } catch (error) {
      console.error('Token storage failed:', error);
    }
  }

  // トークンを安全に取得
  static getToken(): string | null {
    try {
      const encryptedToken = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedToken) return null;
      return atob(encryptedToken); // Base64デコード
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }

  // トークンを削除
  static removeToken(): void {
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Token removal failed:', error);
    }
  }

  // ユーザー情報を安全に保存
  static setUserData(userData: { id: number; name: string; email: string }): void {
    try {
      const encryptedData = btoa(JSON.stringify(userData));
      sessionStorage.setItem(this.USER_KEY, encryptedData);
    } catch (error) {
      console.error('User data storage failed:', error);
    }
  }

  // ユーザー情報を安全に取得
  static getUserData(): { id: number; name: string; email: string } | null {
    try {
      const encryptedData = sessionStorage.getItem(this.USER_KEY);
      if (!encryptedData) return null;
      return JSON.parse(atob(encryptedData));
    } catch (error) {
      console.error('User data retrieval failed:', error);
      return null;
    }
  }

  // ユーザー情報を削除
  static removeUserData(): void {
    try {
      sessionStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('User data removal failed:', error);
    }
  }

  // 認証状態をチェック
  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // 完全なログアウト
  static logout(): void {
    this.removeToken();
    this.removeUserData();
    // 古いlocalStorageデータも削除
    localStorage.removeItem('userId');
    localStorage.removeItem('authToken');
  }
}

// セキュアなAPI呼び出し関数
export async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const token = SecureTokenManager.getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // FormDataの場合はContent-Typeを自動設定に任せる
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // 認証情報を自動的に追加
  // 1. JWTトークンをAuthorizationヘッダーに追加
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. 開発環境ではx-user-idヘッダーを追加
  if (import.meta.env.DEV) {
    const userData = SecureTokenManager.getUserData();
    const localStorageUserId = localStorage.getItem('userId');

    // 現在のユーザーデータとlocalStorageのuserIdが一致するかチェック
    if (userData?.id && localStorageUserId) {
      try {
        const parsedLocalStorageUserId = JSON.parse(localStorageUserId);
        if (parsedLocalStorageUserId !== userData.id) {
          // 一致しない場合はlocalStorageをクリア
          console.warn('localStorageのuserIdが現在のユーザーと一致しません。クリアします。', {
            localStorageUserId: parsedLocalStorageUserId,
            currentUserId: userData.id
          });
          localStorage.removeItem('userId');
        }
      } catch {
        // JSONパースエラーの場合もクリア
        localStorage.removeItem('userId');
      }
    }

    // 現在のユーザーデータを優先してヘッダーに設定
    if (userData?.id) {
      headers['x-user-id'] = userData.id.toString();
    } else if (localStorageUserId) {
      try {
        const parsedUserId = JSON.parse(localStorageUserId);
        if (parsedUserId !== null && parsedUserId !== undefined) {
          headers['x-user-id'] = parsedUserId.toString();
        }
      } catch {
        if (localStorageUserId !== 'null' && localStorageUserId !== 'undefined') {
          headers['x-user-id'] = localStorageUserId;
        }
      }
    }
  }

  // 3. 本番環境ではセッションストレージからユーザーIDを取得
  if (!import.meta.env.DEV) {
    const userData = SecureTokenManager.getUserData();
    if (userData?.id) {
      headers['x-user-id'] = userData.id.toString();
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 401エラーの場合は自動ログアウト
  if (response.status === 401) {
    SecureTokenManager.logout();
    window.location.href = '/'; // ログインページにリダイレクト
  }

  // エラーレスポンスの場合は詳細をログに出力
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error ${response.status}:`, errorText);
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response;
}

// 後方互換性のための関数（段階的に移行するため）
export function getUserId(): number | null {
  const userData = SecureTokenManager.getUserData();
  return userData?.id || null;
}

// セキュアな認証フック
export const useSecureAuth = () => {
  const isAuthenticated = SecureTokenManager.isAuthenticated();
  const userData = SecureTokenManager.getUserData();

  const login = (token: string, user: { id: number; name: string; email: string }) => {
    SecureTokenManager.setToken(token);
    SecureTokenManager.setUserData(user);
  };

  const logout = () => {
    SecureTokenManager.logout();
  };

  return {
    isAuthenticated,
    userData,
    login,
    logout,
  };
};
