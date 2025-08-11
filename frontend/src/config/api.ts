// Toast表示用のフック
import { useToast } from '../components/atoms/ToastContainer';

// 統一されたAPIレスポンス形式
export interface ApiResponse<T = any> {
  success: boolean;
  type: 'success' | 'error' | 'info' | 'warn' | 'fatal';
  message: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

// API_BASEの設定
const getApiBase = () => {
  // 開発環境またはローカル環境
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const port = import.meta.env.VITE_PORT || '3000';
    return `http://localhost:${port}`;
  }

  // 本番環境（同じサーバー）
  const protocol = window.location.protocol;
  const apiBase = `${protocol}//${window.location.hostname}/api`;

  console.log('API Base URL:', apiBase);
  return apiBase;
};

export const API_BASE = getApiBase();

// Mapbox API Key
export const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

// セキュアなトークン管理
class SecureTokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_DATA_KEY = 'user_data';

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static setUserData(userData: any): void {
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
  }

  static getUserData(): any | null {
    const data = localStorage.getItem(this.USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  static removeUserData(): void {
    localStorage.removeItem(this.USER_DATA_KEY);
  }

  static logout(): void {
    this.removeToken();
    this.removeUserData();
  }
}

// API呼び出し結果をToast表示する関数
export const showApiResult = (result: ApiResponse, showToast: ReturnType<typeof useToast>['showToast']) => {
  const { type, message } = result;

  // メッセージが空の場合は表示しない
  if (!message || message.trim() === '') {
    return;
  }

  // ToastTypeに変換
  let toastType: 'success' | 'error' | 'warning' | 'info';
  switch (type) {
    case 'success':
      toastType = 'success';
      break;
    case 'error':
    case 'fatal':
      toastType = 'error';
      break;
    case 'warn':
      toastType = 'warning';
      break;
    case 'info':
      toastType = 'info';
      break;
    default:
      toastType = 'info';
  }

  showToast(message, toastType);
};

// セキュアなAPI呼び出し関数（Toast統合版）
export async function apiCallWithToast<T = any>(
  url: string,
  options: ApiCallOptions = {},
  showToast: ReturnType<typeof useToast>['showToast']
): Promise<ApiResponse<T>> {
  try {
    const response = await apiCall(url, options);
    const data = await response.json();

    // 成功レスポンスの場合
    if (response.ok) {
      const result: ApiResponse<T> = {
        success: true,
        type: 'success',
        message: data.message || '処理が完了しました',
        data: data,
        statusCode: response.status
      };

      showApiResult(result, showToast);
      return result;
    }

    // エラーレスポンスの場合
    const result: ApiResponse<T> = {
      success: false,
      type: 'error',
      message: data.error || data.message || 'エラーが発生しました',
      error: data.error || data.message,
      statusCode: response.status
    };

    showApiResult(result, showToast);
    return result;

  } catch (error: any) {
    console.error(`API Error:`, error);

    const result: ApiResponse<T> = {
      success: false,
      type: 'fatal',
      message: 'ネットワークエラーが発生しました',
      error: error.message,
      statusCode: 0
    };

    showApiResult(result, showToast);
    return result;
  }
}

// API呼び出しオプション
interface ApiCallOptions extends RequestInit {
  requireAuth?: boolean; // 認証が必要かどうか（デフォルト: true）
  retryCount?: number;   // リトライ回数（デフォルト: 0）
}

// セキュアなAPI呼び出し関数
export async function apiCall(url: string, options: ApiCallOptions = {}): Promise<Response> {
  const { requireAuth = true, retryCount = 0, ...fetchOptions } = options;

  // 認証が必要で、かつ認証されていない場合はエラーを投げる
  if (requireAuth && !isAuthenticated()) {
    console.error('[apiCall] 認証エラー:', url, '認証状態:', isAuthenticated());
    const error = new Error('認証が必要です');
    (error as any).status = 401;
    throw error;
  }

  const token = SecureTokenManager.getToken();
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    console.warn('[apiCall] トークンなし:', url);
  }

  // 認証が必要な場合のみユーザーIDをヘッダーに追加（バックエンドで使用）
  if (requireAuth) {
    const userData = SecureTokenManager.getUserData();
    const localStorageUserId = localStorage.getItem('user_id');

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

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // エラーレスポンスの場合は詳細をログに出力
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);

      // 401エラーの場合は自動ログアウト（無限ループを防ぐため条件付き）
      if (response.status === 401 && !window.location.pathname.includes('/login')) {
        SecureTokenManager.logout();
        // 現在のページがログインページでない場合のみリダイレクト
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }

      // 403エラー（Invalid token）の場合も自動ログアウト
      if (response.status === 403 && !window.location.pathname.includes('/login')) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error === 'Invalid token') {
            SecureTokenManager.logout();
            // 現在のページがログインページでない場合のみリダイレクト
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
          }
        } catch (parseError) {
          // JSONパースに失敗した場合は、エラーテキストに"Invalid token"が含まれているかチェック
          if (errorText.includes('Invalid token')) {
            SecureTokenManager.logout();
            // 現在のページがログインページでない場合のみリダイレクト
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
          }
        }
      }

      // 429エラー（レート制限）の場合は特別な処理
      if (response.status === 429) {
        console.warn('[apiCall] レート制限に達しました:', url);
      }

      const error = new Error(`API Error ${response.status}: ${errorText}`);
      (error as any).status = response.status;
      throw error;
    }

    return response;
  } catch (error: any) {
    // 401エラーまたはネットワークエラーの場合はリトライしない
    if (error.status === 401 || error.status === 403 || error.name === 'TypeError') {
      throw error;
    }

    // リトライ回数が残っている場合は再試行
    if (retryCount > 0) {
      console.log(`API呼び出しをリトライします: ${url} (残り${retryCount}回)`);
      return apiCall(url, { ...options, retryCount: retryCount - 1 });
    }

    throw error;
  }
}

// 認証関連の関数
export const login = (token: string, userData: any) => {
  SecureTokenManager.setToken(token);
  SecureTokenManager.setUserData(userData);
};

export const logout = () => {
  SecureTokenManager.logout();
};

export const isAuthenticated = (): boolean => {
  const token = SecureTokenManager.getToken();
  const userData = SecureTokenManager.getUserData();

  // トークンが存在しない場合は認証されていない
  if (!token) {
    return false;
  }

  // ユーザーデータが存在しない場合も認証されていない
  if (!userData || !userData.id) {
    return false;
  }

  // トークンが存在し、ユーザーデータも存在する場合は認証されている
  return true;
};

export const getCurrentUser = () => {
  return SecureTokenManager.getUserData();
};

// セキュアな認証フック
export const useSecureAuth = () => {
  const login = (token: string, user: { id: number; name: string; email: string }) => {
    SecureTokenManager.setToken(token);
    SecureTokenManager.setUserData(user);
  };

  const logout = () => {
    SecureTokenManager.logout();
  };

  const isAuthenticated = () => {
    const token = SecureTokenManager.getToken();
    const userData = SecureTokenManager.getUserData();

    // トークンが存在しない場合は認証されていない
    if (!token) {
      return false;
    }

    // ユーザーデータが存在しない場合も認証されていない
    if (!userData || !userData.id) {
      return false;
    }

    // トークンが存在し、ユーザーデータも存在する場合は認証されている
    return true;
  };

  return { login, logout, isAuthenticated };
};
