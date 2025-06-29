import CustomText from '../atoms/CustomText';

export interface LogItem {
  message: string;
  time: string;
  type?: string;
}

export default function CustomLogLine({ log }: { log: LogItem }) {
  function formatTime(t: string) {
    const d = new Date(t);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(
      d.getMinutes(),
    )}${pad(d.getSeconds())}`;
  }

  function renderMessage(msg: string) {
    const parts = msg.split(/(<[^>]+>)/g).filter(Boolean);
    return parts.map((p, idx) => {
      if (p.startsWith('<') && p.endsWith('>')) {
        const content = p.slice(1, -1);
        let cls = 'log-shrine';
        if (content.startsWith('user:')) {
          cls = 'log-user';
          return (
            <CustomText key={idx} className={cls}>
              {'<'}{content.slice(5)}{'>'}
            </CustomText>
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
          return (
            <CustomText key={idx} className={cls}>
              {'<'}{content.slice(7)}{'>'}
            </CustomText>
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
