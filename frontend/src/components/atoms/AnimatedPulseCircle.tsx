import { useEffect, useRef, useState } from 'react';
import { useSkin } from '../../skins/SkinContext';

interface AnimatedPulseCircleProps {
  pixelRadius: number;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

const RING_OPACITY = 1;
const RING_WIDTH = 5;
const DURATION = 1800; // ms

export default function AnimatedPulseCircle({ pixelRadius }: AnimatedPulseCircleProps) {
  const { skin } = useSkin();
  const [animT, setAnimT] = useState(0);
  const lastTimestampRef = useRef<number | null>(null);

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
  const eased = easeOutCubic(animT);
  const ring = {
    r: pixelRadius * eased,
    opacity: 1 - eased,
  };
  return ring.r > 6 && ring.r < pixelRadius ? (
    <circle
      cx={0}
      cy={0}
      r={ring.r}
      fill="none"
      stroke={skin.colors.surface}
      strokeWidth={RING_WIDTH}
      opacity={RING_OPACITY * ring.opacity}
    />
  ) : null;
}
