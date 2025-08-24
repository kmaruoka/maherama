import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useApiWithToast } from './useApiWithToast';
import { useImageCache } from './useImageCache';

export interface ImageManagementOptions {
  entityType: 'shrine' | 'diety' | 'user';
  entityId: number;
  userId?: number;
  noImageUrl: string;
  queryKeys: string[];
  // 関連クエリの無効化キーを指定
  relatedQueryKeys?: string[][];
}

export interface ImageManagementState {
  thumbCache: number;
  retryCount: number;
  imageLoadError: boolean;
  isImageLoading: boolean;
  isUploadModalOpen: boolean;
  shouldUseFallback: boolean;
  currentImageUrl: string;
}

export interface ImageManagementActions {
  handleUpload: (file: File) => Promise<void>;
  handleVote: () => Promise<void>;
  handleImageVote: (imageId: number) => Promise<void>;
  setIsUploadModalOpen: (open: boolean) => void;
  resetImageState: () => void;
  handleImageUrlChange: (imageUrl: string) => void;
  setImageUrlFromEntityData: (entityData: any) => void;
  getUnifiedImageUrl: (entityData: any) => string;
}

// entityTypeから正しい複数形を取得する関数
function getEntityTypePlural(entityType: string): string {
  switch (entityType) {
    case 'diety':
      return 'dieties';
    case 'shrine':
      return 'shrines';
    case 'user':
      return 'users';
    default:
      return `${entityType}s`;
  }
}

export function useImageManagement(options: ImageManagementOptions): [ImageManagementState, ImageManagementActions] {
  const queryClient = useQueryClient();
  const { callApi } = useApiWithToast();
  const { updateImageUrls } = useImageCache();

  const [thumbCache, setThumbCache] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(options.noImageUrl);

  // 画像存在確認の重複を防ぐためのref
  const checkingImageRef = useRef<string | null>(null);

  const MAX_RETRIES = 2;

  // 強制的に統一された画像URL取得ロジック
  const getUnifiedImageUrl = useCallback((entityData: any): string => {
    if (!entityData) return options.noImageUrl;

    // 統一された優先順位: m > s > 元のimage_url > noImageUrl
    const imageUrl = entityData.image_url_m ||
                    entityData.image_url_s ||
                    entityData.image_url ||
                    options.noImageUrl;

    // 無効なURLの場合はnoImageUrlを使用
    if (!imageUrl ||
        imageUrl === 'null' ||
        imageUrl === 'undefined' ||
        imageUrl.includes('noimage') ||
        imageUrl.includes('null')) {
      return options.noImageUrl;
    }

    return imageUrl;
  }, [options.noImageUrl]);

  const resetImageState = useCallback(() => {
    setRetryCount(0);
    setImageLoadError(false);
    setIsImageLoading(false);
    setShouldUseFallback(false);
  }, []);

  // 画像URLが変更されたときに存在確認を行う（同期的に処理）
  const handleImageUrlChange = useCallback((imageUrl: string) => {
    // 現在の画像URLを更新
    setCurrentImageUrl(imageUrl);

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

  // エンティティデータから画像URLを自動設定する関数
  const setImageUrlFromEntityData = useCallback((entityData: any) => {
    const unifiedImageUrl = getUnifiedImageUrl(entityData);
    handleImageUrlChange(unifiedImageUrl);
  }, [getUnifiedImageUrl, handleImageUrlChange]);

  const handleUpload = useCallback(async (file: File) => {
    try {
      if (!options.entityId || options.entityId === 0) {
        throw new Error('エンティティIDが無効です');
      }

      const formData = new FormData();
      formData.append('image', file);

      const result = await callApi(`/api/${getEntityTypePlural(options.entityType)}/${options.entityId}/images/upload`, {
        method: 'POST',
        body: formData
      });

      if (result.success) {
        // リトライカウントとエラーフラグをリセット
        setRetryCount(0);
        setImageLoadError(false);
        setIsImageLoading(false);

        // 即座にキャッシュを更新（最初に実行）
        setThumbCache(prev => prev + 1);

        // すべての関連クエリを無効化
        const queriesToInvalidate = [
          ...options.queryKeys.map(key => [key]),
          ...(options.relatedQueryKeys || [])
        ];

        // すべてのクエリを並行して無効化
        await Promise.all(
          queriesToInvalidate.map(queryKey =>
            queryClient.invalidateQueries({ queryKey })
          )
        );



        // メインクエリを強制的に再取得
        await Promise.all(
          options.queryKeys.map(key =>
            queryClient.refetchQueries({ queryKey: [key] })
          )
        );

        // 関連クエリを再取得（キャッシュを保持しつつ更新）
        if (options.relatedQueryKeys) {
          await Promise.all(
            options.relatedQueryKeys.map(queryKey =>
              queryClient.refetchQueries({ queryKey })
            )
          );
        }

        // 統一された画像キャッシュシステムで画像を更新
        if (options.entityId) {
          await updateImageUrls(options.entityType, options.entityId);
        }




      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      // エラーはapi-toast連携システムで自動的に処理される
    }
  }, [options.entityType, options.entityId, options.userId, options.queryKeys, queryClient, callApi]);

  const handleVote = useCallback(async () => {
    try {
      if (!options.entityId || options.entityId === 0) {
        throw new Error('エンティティIDが無効です');
      }

      const result = await callApi(`/api/${getEntityTypePlural(options.entityType)}/${options.entityId}/images/vote`, {
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
      if (!options.entityId || options.entityId === 0) {
        throw new Error('エンティティIDが無効です');
      }

      const result = await callApi(`/api/${getEntityTypePlural(options.entityType)}/${options.entityId}/images/${imageId}/vote`, {
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
    shouldUseFallback,
    currentImageUrl
  };

  const actions: ImageManagementActions = useMemo(() => ({
    handleUpload,
    handleVote,
    handleImageVote,
    setIsUploadModalOpen,
    resetImageState,
    handleImageUrlChange,
    setImageUrlFromEntityData,
    getUnifiedImageUrl
  }), [handleUpload, handleVote, handleImageVote, setIsUploadModalOpen, resetImageState, handleImageUrlChange, setImageUrlFromEntityData, getUnifiedImageUrl]);

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
