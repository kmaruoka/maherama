import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/atoms';
import { API_BASE } from '../config/api';

export interface ImageManagementOptions {
  entityType: 'shrine' | 'diety' | 'user';
  entityId: number;
  userId?: number;
  noImageUrl: string;
  queryKeys: string[];
}

export interface ImageManagementState {
  thumbCache: number;
  retryCount: number;
  imageLoadError: boolean;
  isImageLoading: boolean;
  isUploadModalOpen: boolean;
  shouldUseFallback: boolean;
}

export interface ImageManagementActions {
  handleUpload: (file: File) => Promise<void>;
  handleVote: () => Promise<void>;
  handleImageVote: (imageId: number) => Promise<void>;
  setIsUploadModalOpen: (open: boolean) => void;
  resetImageState: () => void;
  handleImageUrlChange: (imageUrl: string) => void;
}

export function useImageManagement(options: ImageManagementOptions): [ImageManagementState, ImageManagementActions] {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [thumbCache, setThumbCache] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);

  // 画像存在確認の重複を防ぐためのref
  const checkingImageRef = useRef<string | null>(null);

  const MAX_RETRIES = 2;

  const resetImageState = useCallback(() => {
    setRetryCount(0);
    setImageLoadError(false);
    setIsImageLoading(false);
    setShouldUseFallback(false);
    // キャッシュバスティングは必要な時のみ実行
    // setThumbCache(prev => prev + 1);
  }, []);

  // 画像URLが変更されたときに存在確認を行う（同期的に処理）
  const handleImageUrlChange = useCallback((imageUrl: string) => {
    if (!imageUrl || imageUrl === options.noImageUrl || imageUrl.includes('noimage') || imageUrl.includes('null')) {
      // NoImageの場合はfallbackを使用しない（無限ループを防ぐ）
      setShouldUseFallback(false);
      checkingImageRef.current = null;
      return;
    }

    // 既に同じ画像をチェック中の場合はスキップ
    if (checkingImageRef.current === imageUrl) {
      return;
    }

    checkingImageRef.current = imageUrl;

    // 画像の存在確認を同期的に行う（エラー時はfallbackを使用）
    const img = new Image();
    img.onload = () => {
      setShouldUseFallback(false);
      checkingImageRef.current = null;
    };
    img.onerror = () => {
      setShouldUseFallback(true);
      checkingImageRef.current = null;
    };
    img.src = imageUrl;
  }, [options.noImageUrl]);

  const handleUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const headers: Record<string, string> = {};
      if (options.userId) {
        headers['x-user-id'] = String(options.userId);
      }

      const response = await fetch(`${API_BASE}/${options.entityType}s/${options.entityId}/images/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error('アップロード失敗');
      }

      const result = await response.json();

      // クエリを無効化して再取得
      await Promise.all(
        options.queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
      );

      // データの再取得を確実に待つ
      await queryClient.refetchQueries({ queryKey: [options.queryKeys[0]] });

      // リトライカウントとエラーフラグをリセット
      setRetryCount(0);
      setImageLoadError(false);
      setIsImageLoading(false);

      // アップロード成功時のみキャッシュを更新
      setThumbCache(prev => prev + 1);

      if (result.isCurrentThumbnail) {
        showToast(t('uploadSuccess'), 'success');
      } else {
        showToast(t('uploadPending'), 'info');
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      showToast(t('uploadError'), 'error');
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, showToast, t]);

  const handleVote = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (options.userId) {
        headers['x-user-id'] = String(options.userId);
      }

      const response = await fetch(`${API_BASE}/${options.entityType}s/${options.entityId}/images/vote`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        let errorMsg = '投票失敗';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          const text = await response.text();
          if (text.startsWith('<!DOCTYPE')) {
            errorMsg = 'サーバーエラーまたはAPIが見つかりません';
          } else {
            errorMsg = text;
          }
        }
        throw new Error(errorMsg);
      }

      // 成功時はデータ再取得
      await Promise.all(
        options.queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
      );
      showToast(t('voteSuccess'), 'success');
    } catch (error) {
      console.error('投票エラー:', error);
      showToast(error instanceof Error ? error.message : t('voteError'), 'error');
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, showToast, t]);

  const handleImageVote = useCallback(async (imageId: number) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (options.userId) {
        headers['x-user-id'] = String(options.userId);
      }

      const response = await fetch(`${API_BASE}/${options.entityType}s/${options.entityId}/images/${imageId}/vote`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        let errorMsg = '投票失敗';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          const text = await response.text();
          if (text.startsWith('<!DOCTYPE')) {
            errorMsg = 'サーバーエラーまたはAPIが見つかりません';
          } else {
            errorMsg = text;
          }
        }
        throw new Error(errorMsg);
      }

      await Promise.all(
        options.queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
      );
      showToast(t('voteSuccess'), 'success');
    } catch (error) {
      console.error('投票エラー:', error);
      showToast(error instanceof Error ? error.message : t('voteError'), 'error');
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, showToast, t]);

  const state: ImageManagementState = {
    thumbCache,
    retryCount,
    imageLoadError,
    isImageLoading,
    isUploadModalOpen,
    shouldUseFallback
  };

  const actions: ImageManagementActions = useMemo(() => ({
    handleUpload,
    handleVote,
    handleImageVote,
    setIsUploadModalOpen,
    resetImageState,
    handleImageUrlChange
  }), [handleUpload, handleVote, handleImageVote, setIsUploadModalOpen, resetImageState, handleImageUrlChange]);

  return [state, actions];
}

// 画像のローディング状態を管理するフック
export function useImageLoading() {
  const [retryCount, setRetryCount] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const MAX_RETRIES = 1; // リトライ回数を1回に制限

  const handleImageError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      return true; // リトライ可能
    } else {
      setImageLoadError(true);
      return false; // リトライ不可
    }
  }, [retryCount]);

  const handleImageLoad = useCallback(() => {
    setImageLoadError(false);
    setIsImageLoading(false);
  }, []);

  const handleImageLoadStart = useCallback(() => {
    setIsImageLoading(true);
  }, []);

  const resetImageState = useCallback(() => {
    setRetryCount(0);
    setImageLoadError(false);
    setIsImageLoading(false);
  }, []);

  return {
    retryCount,
    imageLoadError,
    isImageLoading,
    handleImageError,
    handleImageLoad,
    handleImageLoadStart,
    resetImageState
  };
}
