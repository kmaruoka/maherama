import CustomText from '../atoms/CustomText';
import CustomLink from '../atoms/CustomLink';

export interface LogItem {
  message: string;
  time: string;
  type?: string;
}

interface CustomLogLineProps {
  log: LogItem;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowUser?: (id: number) => void;
}

export default function CustomLogLine({ log, onShowShrine, onShowDiety, onShowUser }: CustomLogLineProps) {
  function formatTime(t: string) {
    const d = new Date(t);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderMessage(msg: string) {
    const parts = msg.split(/(<[^>]+>)/g).filter(Boolean);
    return parts.map((p, idx) => {
      if (p.startsWith('<') && p.endsWith('>')) {
        const content = p.slice(1, -1);
        let cls = 'log-shrine';
        if (content.startsWith('user:')) {
          cls = 'log-user';
          const [id, name] = content.slice(5).split(':');
          return (
            <CustomLink key={idx} type="user" onClick={onShowUser ? () => {
              const btn = window.document.querySelector('.leaflet-popup-close-button') as HTMLElement | null;
              if (btn) btn.click();
              setTimeout(() => onShowUser(Number(id)), 0);
            } : undefined} className={cls}>
              {name || id}
            </CustomLink>
          );
        }
        if (content.startsWith('region:')) {
          cls = 'log-region';
          return (
            <CustomText key={idx} className={cls}>
              {'<'}{content.slice(7)}{'>'}
            </CustomText>
          );
        }
        if (content.startsWith('shrine:')) {
          cls = 'log-shrine';
          const [id, name] = content.slice(7).split(':');
          return (
            <CustomLink key={idx} type="shrine" onClick={onShowShrine ? () => {
              const btn = window.document.querySelector('.leaflet-popup-close-button') as HTMLElement | null;
              if (btn) btn.click();
              setTimeout(() => onShowShrine(Number(id)), 0);
            } : undefined} className={cls}>
              {name || id}
            </CustomLink>
          );
        }
        if (content.startsWith('diety:')) {
          cls = 'log-shrine';
          const [id, name] = content.slice(6).split(':');
          return (
            <CustomLink key={idx} type="diety" onClick={onShowDiety ? () => {
              const btn = window.document.querySelector('.leaflet-popup-close-button') as HTMLElement | null;
              if (btn) btn.click();
              setTimeout(() => onShowDiety(Number(id)), 0);
            } : undefined} className={cls}>
              {name || id}
            </CustomLink>
          );
        }
        return (
          <CustomText key={idx} className={cls}>
            {'<'}{content}{'>'}
          </CustomText>
        );
      }
      return <CustomText key={idx}>{p}</CustomText>;
    });
  }

  return (
    <div className={`px-2 py-1 border-b border-gray-600 ${log.type === 'system' ? 'log-system' : ''}`}> 
      {formatTime(log.time)} {renderMessage(log.message)}
    </div>
  );
}
