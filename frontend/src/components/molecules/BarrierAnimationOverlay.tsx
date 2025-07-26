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
      className="barrier-animation-overlay"
      style={{
        left: x,
        top: y,
      }}
    >
      <svg width={pixelRadius * 2} height={pixelRadius * 2} className="barrier-animation-overlay__svg">
        <g transform={`translate(${pixelRadius},${pixelRadius})`}>
          {barrierType === 'wave' && <AnimatedPulseCircle pixelRadius={pixelRadius} />}
          {barrierType === 'search' && <AnimatedRadarCircle pixelRadius={pixelRadius} />}
        </g>
      </svg>
    </div>,
    map.getContainer(),
  );
}
