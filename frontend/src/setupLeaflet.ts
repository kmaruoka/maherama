import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// public配下に画像をコピーしておく
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
});
