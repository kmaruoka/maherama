import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Leafletのデフォルトアイコンのパスを設定
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(markerIcon2xUrl, import.meta.url).toString(),
  iconUrl: new URL(markerIconUrl, import.meta.url).toString(),
  shadowUrl: new URL(markerShadowUrl, import.meta.url).toString(),
});
