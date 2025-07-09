import AnimatedPulseCircle from '../atoms/AnimatedPulseCircle';
import AnimatedRadarCircle from '../atoms/AnimatedRadarCircle';
import useMapCenterPixelRadius from '../../hooks/useMapCenterPixelRadius';

export default function BarrierAnimationOverlay({
  radius,
  barrierType,
}: {
  radius: number;
  barrierType: string;
}) {
  const pixelRadius = useMapCenterPixelRadius(radius);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
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
    </div>
  );
}
