import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useCirclePixelRadius } from '../../hooks/useCirclePixelRadius';

interface AnimatedPulseCircleProps {
  center: [number, number]; // 中心位置（緯度経度）
  radius: number; // メートル単位
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

const RING_COLOR = 'white';
const RING_OPACITY = 1;
const RING_WIDTH = 5;
const DURATION = 1800; // ms

export default function AnimatedPulseCircle({ center, radius }: AnimatedPulseCircleProps) {
  const map = useMap();
  const [animT, setAnimT] = useState(0);
  const [refresh, setRefresh] = useState(0); // 強制再描画用
  const lastTimestampRef = useRef<number | null>(null);

  // 地図イベントで強制再描画
  useMapEvents({
    move: () => setRefresh(r => r + 1),
    zoom: () => setRefresh(r => r + 1),
  });

  // 半径（メートル）→ピクセル
  const pixelRadius = useCirclePixelRadius(center, radius);

  useEffect(() => {
    let frame: number;
    let running = true;
    function animate(ts: number) {
      if (lastTimestampRef.current == null) lastTimestampRef.current = ts;
      const elapsed = ts - lastTimestampRef.current;
      lastTimestampRef.current = ts;
      setAnimT(t => {
        let next = t + elapsed / DURATION;
        if (next > 1) next -= 1;
        return next;
      });
      if (running) {
        frame = requestAnimationFrame(animate);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  // 1本のリングのアニメーション進行度を計算
  let t = animT;
  const eased = easeOutCubic(t);
  const ring = {
    r: pixelRadius * eased,
    opacity: 1 - eased,
  };

  return (
    <>
      {ring.r > 6 && ring.r < pixelRadius ? (
        <circle
          cx={0}
          cy={0}
          r={ring.r}
          fill="none"
          stroke={RING_COLOR}
          strokeWidth={RING_WIDTH}
          opacity={RING_OPACITY * ring.opacity}
        />
      ) : null}
    </>
  );
} 