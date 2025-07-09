import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import AnimatedPulseCircle from '../atoms/AnimatedPulseCircle';
import AnimatedRadarCircle from '../atoms/AnimatedRadarCircle';
import useMapCenterPixelGeometry from '../../hooks/useMapCenterPixelGeometry';

export default function BarrierAnimationOverlay({
  radius,
  barrierType,
}: {
  radius: number;
  barrierType: string;
}) {
  const map = useMap();
  const { x, y, pixelRadius } = useMapCenterPixelGeometry(radius);
  const MARGIN = 6; // strokeやblur分の余白
  const adjustedRadius = pixelRadius + MARGIN;

  return createPortal(
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        zIndex: 410,
      }}
    >
      <svg width={pixelRadius * 2} height={pixelRadius * 2} style={{ overflow: 'visible' }}>
        <g transform={`translate(${pixelRadius},${pixelRadius})`}>
          {barrierType === 'wave' && <AnimatedPulseCircle pixelRadius={pixelRadius} />}
          {barrierType === 'search' && <AnimatedRadarCircle pixelRadius={pixelRadius} />}
        </g>
      </svg>
    </div>,
    map.getContainer(),
  );
}
