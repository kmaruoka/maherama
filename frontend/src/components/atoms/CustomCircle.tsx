import { Circle } from 'react-leaflet';

interface CustomCircleProps {
  center: [number, number];
  radius: number;
  color?: string;
  className?: string;
}

// slots値から半径を計算
function getRadiusFromSlots(slots: number) {
  if (slots === 0) return 100;
  return 100 * Math.pow(2, slots);
}

export default function CustomCircle({ center, radius, color = 'rgba(0, 0, 0, 0.2)', className }: CustomCircleProps) {
  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{ color: undefined, fillColor: color, fillOpacity: 0.5, weight: 0 }}
      className={className}
    />
  );
}
