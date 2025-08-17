import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useApiWithToast } from './useApiWithToast';

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
  const queryClient = useQueryClient();
  const { callApi } = useApiWithToast();

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

      const result = await callApi(`/${options.entityType}s/${options.entityId}/images/upload`, {
        method: 'POST',
        body: formData
      });

      if (result.success) {
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
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      // エラーはapi-toast連携システムで自動的に処理される
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, callApi]);

  const handleVote = useCallback(async () => {
    try {
      const result = await callApi(`/${options.entityType}s/${options.entityId}/images/vote`, {
        method: 'POST'
      });

      if (result.success) {
        // 成功時はデータ再取得
        await Promise.all(
          options.queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
        );
      }
    } catch (error) {
      console.error('投票エラー:', error);
      // エラーはapi-toast連携システムで自動的に処理される
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, callApi]);

  const handleImageVote = useCallback(async (imageId: number) => {
    try {
      const result = await callApi(`/${options.entityType}s/${options.entityId}/images/${imageId}/vote`, {
        method: 'POST'
      });

      if (result.success) {
        await Promise.all(
          options.queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
        );
      }
    } catch (error) {
      console.error('投票エラー:', error);
      // エラーはapi-toast連携システムで自動的に処理される
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, callApi]);

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
