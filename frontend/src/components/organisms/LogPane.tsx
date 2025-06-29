import { useState } from 'react';
import CustomLogLine, { type LogItem } from '../molecules/CustomLogLine';

export default function LogPane({ logs, loading, error }: { logs: LogItem[]; loading: boolean; error: boolean; }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`log-pane ${isExpanded ? 'log-pane-expanded' : 'log-pane-collapsed'}`}
      onClick={() => setIsExpanded(!isExpanded)}
      style={{ cursor: 'pointer' }}
    >
      {loading && <div className="px-2 py-1 text-gray-300">ログを読み込み中...</div>}
      {error && <div className="px-2 py-1 text-red-400">ログの読み込みに失敗しました</div>}
      {logs.length === 0 && !loading && !error && (
        <div className="px-2 py-1 text-gray-300">ログがありません</div>
      )}
      {(isExpanded ? logs : logs.slice(0, 1)).map((l, i) => (
        <CustomLogLine key={i} log={l} />
      ))}
      {!isExpanded && logs.length > 1 && (
        <div className="px-2 py-1 text-center text-gray-400 text-xs">
          他 {logs.length - 1} 件のログがあります
        </div>
      )}
      <div className="px-2 py-1 text-center text-gray-400 text-xs">
        {isExpanded ? 'タップで縮小' : 'タップで拡大'}
      </div>
    </div>
  );
}
