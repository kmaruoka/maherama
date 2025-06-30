console.log('import.meta.env', import.meta.env);

// API_BASEの設定
const getApiBase = () => {
  // 開発環境
  if (import.meta.env.DEV) {
    const port = import.meta.env.VITE_PORT || '3000';
    return `http://localhost:${port}`;
  }
  
  // 本番環境（同じサーバー）
  const port = import.meta.env.VITE_API_PORT || '3000';
  return `http://${window.location.hostname}:${port}`;
};

export const API_BASE = getApiBase();

export const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;
