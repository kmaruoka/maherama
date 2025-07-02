import { Circle } from 'react-leaflet';

interface CustomCircleProps {
  center: [number, number];
  rank: 'free' | 'silver' | 'gold' | 'platinum';
  color?: string;
}

// 課金ランクごとの半径（例）
const RANK_RADIUS: Record<CustomCircleProps['rank'], number> = {
  free: 100,
  silver: 150,
  gold: 200,
  platinum: 300,
};

export default function CustomCircle({ center, rank, color = 'rgba(0, 0, 255, 0.2)' }: CustomCircleProps) {
  return (
    <Circle
      center={center}
      radius={RANK_RADIUS[rank]}
      pathOptions={{ color: undefined, fillColor: color, fillOpacity: 0.5, weight: 0 }}
    />
  );
} 