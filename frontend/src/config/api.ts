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

// 統一されたAPIレスポンス形式
export interface ApiResponse<T = any> {
  success: boolean;
  type: 'success' | 'error' | 'info' | 'warn' | 'fatal';
  message: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Toast表示用のフック
import { useToast } from '../components/atoms/ToastContainer';

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
  options: RequestInit = {},
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
  // 1. JWTトークンをAuthorizationヘッダーに追加（優先）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. x-user-idヘッダーをフォールバックとして追加（両環境共通）
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

// 認証関連の関数
export const login = (token: string, userData: any) => {
  SecureTokenManager.setToken(token);
  SecureTokenManager.setUserData(userData);
  localStorage.setItem('userId', JSON.stringify(userData.id));
};

export const logout = () => {
  SecureTokenManager.logout();
  localStorage.removeItem('userId');
};

export const isAuthenticated = (): boolean => {
  return !!SecureTokenManager.getToken();
};

export const getCurrentUser = () => {
  return SecureTokenManager.getUserData();
};

// セキュアな認証フック
export const useSecureAuth = () => {
  const isAuthenticated = SecureTokenManager.getToken() !== null;
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
