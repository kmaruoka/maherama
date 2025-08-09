import { useEffect, useState } from 'react';

export default function useCurrentPosition(): [number, number] | null {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    console.log('[GPS] 位置情報の取得を開始');
    
    const successCallback = (pos: GeolocationPosition) => {
      const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      console.log('[GPS] 位置情報取得成功:', newPosition);
      setPosition(newPosition);
    };

    const errorCallback = (error: GeolocationPositionError) => {
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
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5分間キャッシュ
    };

    const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
    
    return () => {
      console.log('[GPS] 位置情報の監視を停止');
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return position;
}
