import { useEffect, useState } from 'react';

export default function useCurrentPosition(): [number, number] | null {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return position;
}
