import { useCallback } from 'react';
import { useToast } from '../components/atoms/ToastContainer';
import { apiCallWithToast, ApiResponse } from '../config/api';

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
