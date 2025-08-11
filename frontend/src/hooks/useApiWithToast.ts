import { useCallback } from 'react';
import { useToast } from '../components/atoms/ToastContainer';
import { apiCallWithToast } from '../config/api';

// ApiResponse型を直接定義（importエラーを回避）
interface ApiResponse<T = any> {
  success: boolean;
  type: 'success' | 'error' | 'info' | 'warn' | 'fatal';
  message: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

export function useApiWithToast() {
  const { showToast } = useToast();

  const callApi = useCallback(async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    return apiCallWithToast(url, options, showToast);
  }, [showToast]);

  return { callApi };
}
