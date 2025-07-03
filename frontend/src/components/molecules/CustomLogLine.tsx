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
        if (content.startsWith('user:')) {
          const [id, name] = content.slice(5).split(':');
          return (
            <CustomLink key={idx} onClick={onShowUser ? () => {
              const btn = window.document.querySelector('.leaflet-popup-close-button') as HTMLElement | null;
              if (btn) btn.click();
              setTimeout(() => onShowUser(Number(id)), 0);
            } : undefined} className="tag-link tag-user">
              {name || id}
            </CustomLink>
          );
        }
        if (content.startsWith('region:')) {
          return (
            <CustomText key={idx}>
              {'<'}{content.slice(7)}{'>'}
            </CustomText>
          );
        }
        if (content.startsWith('shrine:')) {
          const [id, name] = content.slice(7).split(':');
          return (
            <CustomLink key={idx} onClick={onShowShrine ? () => {
              const btn = window.document.querySelector('.leaflet-popup-close-button') as HTMLElement | null;
              if (btn) btn.click();
              setTimeout(() => onShowShrine(Number(id)), 0);
            } : undefined} className="tag-link tag-shrine">
              {name || id}
            </CustomLink>
          );
        }
        if (content.startsWith('diety:')) {
          const [id, name] = content.slice(6).split(':');
          return (
            <CustomLink key={idx} onClick={onShowDiety ? () => {
              const btn = window.document.querySelector('.leaflet-popup-close-button') as HTMLElement | null;
              if (btn) btn.click();
              setTimeout(() => onShowDiety(Number(id)), 0);
            } : undefined} className="tag-link tag-diety">
              {name || id}
            </CustomLink>
          );
        }
        return (
          <CustomText key={idx}>
            {'<'}{content}{'>'}
          </CustomText>
        );
      }
      return <CustomText key={idx}>{p}</CustomText>;
    });
  }

  return (
    <div className="px-2 py-1"> 
      {formatTime(log.time)} {renderMessage(log.message)}
    </div>
  );
}
