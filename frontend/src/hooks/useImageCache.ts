import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiCall } from '../config/api';

export interface ImageUrls {
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
}

export function useImageCache() {
  const queryClient = useQueryClient();

  // 画像URLを更新する関数
  const updateImageUrls = useCallback(async (entityType: 'shrine' | 'diety' | 'user', entityId: number) => {
    try {
      // 個別エンティティの画像情報を取得
      const response = await apiCall(`/${entityType}s/${entityId}/image`);
      const imageData: ImageUrls = await response.json();

      // 地図マーカー用のクエリを無効化
      await queryClient.invalidateQueries({
        queryKey: ['all-shrines'],
        exact: true
      });

      // 図鑑ページのキャッシュを直接更新（無効化せず）
      if (entityType === 'shrine') {
        const shrinesVisitedData = queryClient.getQueryData(['shrines-visited']) as any[];
        if (shrinesVisitedData) {
          const updatedShrines = shrinesVisitedData.map(shrine => {
            if (shrine.id === entityId) {
              return {
                ...shrine,
                image_url: imageData.image_url || shrine.image_url,
                image_url_xs: imageData.image_url_xs || shrine.image_url_xs,
                image_url_s: imageData.image_url_s || shrine.image_url_s,
                image_url_m: imageData.image_url_m || shrine.image_url_m,
                image_url_l: imageData.image_url_l || shrine.image_url_l,
                image_url_xl: imageData.image_url_xl || shrine.image_url_xl,
                image_by: imageData.image_by || shrine.image_by
              };
            }
            return shrine;
          });
          queryClient.setQueryData(['shrines-visited'], updatedShrines);
        }
      } else if (entityType === 'diety') {
        const dietiesVisitedData = queryClient.getQueryData(['dieties-visited']) as any[];
        if (dietiesVisitedData) {
          const updatedDieties = dietiesVisitedData.map(diety => {
            if (diety.id === entityId) {
              return {
                ...diety,
                image_url: imageData.image_url || diety.image_url,
                image_url_xs: imageData.image_url_xs || diety.image_url_xs,
                image_url_s: imageData.image_url_s || diety.image_url_s,
                image_url_m: imageData.image_url_m || diety.image_url_m,
                image_url_l: imageData.image_url_l || diety.image_url_l,
                image_url_xl: imageData.image_url_xl || diety.image_url_xl,
                image_by: imageData.image_by || diety.image_by
              };
            }
            return diety;
          });
          queryClient.setQueryData(['dieties-visited'], updatedDieties);
        }
      }

      // 詳細ページのクエリを無効化
      await queryClient.invalidateQueries({
        queryKey: [entityType, String(entityId)],
        exact: true
      });

      console.log(`[ImageCache] ${entityType} ${entityId} の画像を更新しました`);
    } catch (error) {
      console.error(`[ImageCache] 画像更新エラー:`, error);
    }
  }, [queryClient]);

  return { updateImageUrls };
}
