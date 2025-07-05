import { useState } from 'react';
import CustomLogLine, { type LogItem } from '../molecules/CustomLogLine';

interface LogPaneProps {
  logs: LogItem[];
  loading: boolean;
  error: boolean;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
}

export default function LogPane({ logs, loading, error, onShowShrine, onShowDiety, onShowUser }: LogPaneProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePaneClick = (e: React.MouseEvent) => {
    // リンクやボタンがクリックされた場合は拡大・縮小しない
    if ((e.target as HTMLElement).closest('.custom-link, button, a')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    return (
      <div
        className={`log-pane log-pane-collapsed`}
        onClick={handlePaneClick}
        style={{ cursor: 'pointer', paddingBottom: '2.5rem', position: 'relative', background: 'rgba(255,255,255,0.7)' }}
      >
        {loading && <div className="px-2 py-1 text-secondary">ログを読み込み中...</div>}
        {error && <div className="px-2 py-1 text-danger">ログの読み込みに失敗しました</div>}
        {logs.length === 0 && !loading && !error && (
          <div className="px-2 py-1 text-secondary">ログがありません</div>
        )}
        {logs.slice(0, 1).map((l, i) => (
          <CustomLogLine key={i} log={l} onShowShrine={onShowShrine} onShowDiety={onShowDiety} onShowUser={onShowUser} />
        ))}
      </div>
    );
  }

  // 拡大時はbackdropを追加
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} onClick={() => setIsExpanded(false)} />
      <div
        className={`log-pane log-pane-expanded`}
        style={{
          cursor: 'pointer',
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '3rem',
          zIndex: 10000,
          background: 'rgba(255,255,255,0.7)'
        }}
        onClick={handlePaneClick}
      >
        {loading && <div className="px-2 py-1 text-secondary">ログを読み込み中...</div>}
        {error && <div className="px-2 py-1 text-danger">ログの読み込みに失敗しました</div>}
        {logs.length === 0 && !loading && !error && (
          <div className="px-2 py-1 text-secondary">ログがありません</div>)}
        {logs.map((l, i) => (
          <CustomLogLine key={i} log={l} onShowShrine={onShowShrine} onShowDiety={onShowDiety} onShowUser={onShowUser} />
        ))}
      </div>
    </div>
  );
}
