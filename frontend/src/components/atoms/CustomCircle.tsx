import { Circle } from 'react-leaflet';

interface CustomCircleProps {
  center: [number, number];
  rank: number; // slots値を直接受け入れる
  color?: string;
}

// slots値から半径を計算
function getRadiusFromSlots(slots: number) {
  if (slots === 0) return 100;
  return 100 * Math.pow(2, slots);
}

export default function CustomCircle({ center, rank, color = 'rgba(0, 0, 255, 0.2)' }: CustomCircleProps) {
  return (
    <Circle
      center={center}
      radius={getRadiusFromSlots(rank)}
      pathOptions={{ color: undefined, fillColor: color, fillOpacity: 0.5, weight: 0 }}
    />
  );
} 