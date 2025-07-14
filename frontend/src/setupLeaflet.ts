import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// public配下に画像をコピーしておく
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
});

// --- shrine-marker-thumbnail-gloss一括アニメーション（ちらつき根絶） ---
(function startGlossyAnimation() {
  const DURATION = 2000; // ms
  const BASE = performance.now();
  function animate() {
    const now = performance.now();
    const elapsed = (now - BASE) % DURATION;
    const progress = elapsed / DURATION;
    document.documentElement.style.setProperty('--gloss-progress', progress.toString());
    const opacity = progress > 0.1 && progress < 0.9 ? 1 : 0;
    document.documentElement.style.setProperty('--gloss-opacity', opacity.toString());
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
