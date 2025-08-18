import { useEffect, useRef, useState } from 'react';

export default function useCurrentPosition(): [number, number] | null {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    console.log('[GPS] 位置情報の取得を開始');

    const successCallback = (pos: GeolocationPosition) => {
      if (isMountedRef.current) {
        const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        console.log('[GPS] 位置情報取得成功:', newPosition);
        setPosition(newPosition);

        // 初回取得時のみログ出力
        if (!hasInitializedRef.current) {
          console.log('[GPS] 初回位置情報取得完了');
          hasInitializedRef.current = true;
        }
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      if (isMountedRef.current) {
        console.error('[GPS] 位置情報取得エラー:', error.code, error.message);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error('[GPS] 位置情報の許可が拒否されました');
            break;
          case error.POSITION_UNAVAILABLE:
            console.error('[GPS] 位置情報が利用できません');
            break;
          case error.TIMEOUT:
            console.error('[GPS] 位置情報の取得がタイムアウトしました');
            break;
        }

        // 初回エラー時のみログ出力
        if (!hasInitializedRef.current) {
          console.log('[GPS] 初回位置情報取得失敗');
          hasInitializedRef.current = true;
        }
      }
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5分間キャッシュ
    };

    let watchId: number | null = null;

    try {
      // まず現在位置を一度取得
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

      // その後、継続的に監視
      watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
    } catch (error) {
      console.error('[GPS] 位置情報の監視開始に失敗:', error);
      hasInitializedRef.current = true;
    }

    return () => {
      console.log('[GPS] 位置情報の監視を停止');
      isMountedRef.current = false;
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (error) {
          console.error('[GPS] 位置情報の監視停止に失敗:', error);
        }
      }
    };
  }, []);

  return position;
}
