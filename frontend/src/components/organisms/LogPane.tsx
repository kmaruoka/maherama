import { useRef, useEffect, useState } from 'react';
import CustomLogLine, { type LogItem } from '../molecules/CustomLogLine';
import { useSkin } from '../../skins/SkinContext';

interface LogPaneProps {
  logs: LogItem[];
  loading: boolean;
  error: boolean;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
  debugLogs?: string[];
}

// 16進カラーをrgbaに変換するユーティリティ
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function LogPane({ logs, loading, error, onShowShrine, onShowDiety, onShowUser, debugLogs }: LogPaneProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { skin } = useSkin();
  const expandedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isExpanded && expandedRef.current) {
      expandedRef.current.scrollTop = expandedRef.current.scrollHeight;
    }
  }, [isExpanded, logs]);

  const handlePaneClick = (e: React.MouseEvent) => {
    // リンクやボタンがクリックされた場合は拡大・縮小しない
    if ((e.target as HTMLElement).closest('.custom-link, button, a')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const getLogPaneBg = () => {
    // surface色が#で始まる場合のみ半透明化
    if (skin.colors.surface.startsWith('#')) {
      // ダーク系はalpha 0.85、明色系は0.7
      const isDark = skin.name === '夜';
      return hexToRgba(skin.colors.surface, isDark ? 0.85 : 0.7);
    }
    return skin.colors.surface;
  };

  if (!isExpanded) {
    return (
      <div
        className={`log-pane log-pane-collapsed`}
        onClick={handlePaneClick}
        style={{
          background: getLogPaneBg(),
          color: skin.colors.logText,
          cursor: 'pointer',
        }}
      >
        {debugLogs && debugLogs.length > 0 && (
          <div className="px-2 py-1 text-warning" style={{ fontSize: '0.95em' }}>
            {debugLogs.slice(-5).map((msg, i) => (
              <div key={i}>[DEBUG] {msg}</div>
            ))}
          </div>
        )}
        {loading && <div className="px-2 py-1 text-secondary">ログを読み込み中...</div>}
        {error && <div className="px-2 py-1 text-danger">ログの読み込みに失敗しました</div>}
        {logs.length === 0 && !loading && !error && (
          <div className="px-2 py-1 text-secondary">ログがありません</div>
        )}
        {logs.length > 0 && (
          <CustomLogLine log={logs[0]} onShowShrine={onShowShrine} onShowDiety={onShowDiety} onShowUser={onShowUser} />
        )}
      </div>
    );
  }

  // 拡大時はbackdropを追加
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} onClick={() => setIsExpanded(false)} />
      <div
        className={`log-pane log-pane-expanded`}
        ref={expandedRef}
        style={{
          cursor: 'pointer',
          background: getLogPaneBg(),
          color: skin.colors.logText,
        }}
        onClick={handlePaneClick}
      >
        {debugLogs && debugLogs.length > 0 && (
          <div className="px-2 py-1 text-warning" style={{ fontSize: '0.95em' }}>
            {debugLogs.slice(-20).map((msg, i) => (
              <div key={i}>[DEBUG] {msg}</div>
            ))}
          </div>
        )}
        {loading && <div className="px-2 py-1 text-secondary">ログを読み込み中...</div>}
        {error && <div className="px-2 py-1 text-danger">ログの読み込みに失敗しました</div>}
        {logs.length === 0 && !loading && !error && (
          <div className="px-2 py-1 text-secondary">ログがありません</div>)}
        {logs.slice().reverse().map((l, i) => (
          <CustomLogLine key={i} log={l} onShowShrine={onShowShrine} onShowDiety={onShowDiety} onShowUser={onShowUser} />
        ))}
      </div>
    </div>
  );
}
