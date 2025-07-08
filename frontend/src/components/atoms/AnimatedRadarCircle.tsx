import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useCirclePixelRadius } from '../../hooks/useCirclePixelRadius';

interface AnimatedRadarCircleProps {
  center: [number, number]; // 中心位置（緯度経度）
  radius: number; // メートル単位
}

const DURATION = 2000; // ms 1周の時間
const BEAM_COLOR = '#39ff14'; // 鮮やかな緑
const BEAM_WIDTH = 2; // 線の太さ
const TAIL_COUNT = 12; // 尾の本数
const TAIL_WIDTH_DEG = 10; // 尾の各扇形の幅
const TAIL_STEP_DEG = 3; // 尾の各扇形の角度ずらし

export default function AnimatedRadarCircle({ center, radius }: AnimatedRadarCircleProps) {
  const map = useMap();
  const [angle, setAngle] = useState(0); // 0~360
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
      setAngle(a => {
        let next = a + (elapsed / DURATION) * 360;
        if (next > 360) next -= 360;
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

  // 扇形パス生成
  function describeSector(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const rad = Math.PI / 180;
    const x1 = cx + r * Math.cos(rad * startAngle);
    const y1 = cy + r * Math.sin(rad * startAngle);
    const x2 = cx + r * Math.cos(rad * endAngle);
    const y2 = cy + r * Math.sin(rad * endAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');
  }

  // 尾の扇形たち（グラデーション）
  const tails = Array.from({ length: TAIL_COUNT }).map((_, i) => {
    const tailAngle = angle - (i + 1) * TAIL_STEP_DEG;
    const opacity = 0.12 * (1 - i / TAIL_COUNT); // 後ろほど薄く
    return (
      <path
        key={i}
        d={describeSector(0, 0, pixelRadius, tailAngle, tailAngle + TAIL_WIDTH_DEG)}
        fill={`rgba(57,255,20,${opacity})`}
      />
    );
  });

  // 本体ビーム（中心から外周までの直線）
  const rad = Math.PI / 180;
  const beamX = pixelRadius * Math.cos(rad * angle);
  const beamY = pixelRadius * Math.sin(rad * angle);

  return (
    <>
      {tails}
      <line
        x1={0}
        y1={0}
        x2={beamX}
        y2={beamY}
        stroke={BEAM_COLOR}
        strokeWidth={BEAM_WIDTH}
        opacity={1}
        filter="url(#glow)"
      />
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </>
  );
} 