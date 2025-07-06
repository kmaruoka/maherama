import { useEffect } from 'react';

export default function CutIn({ message, show, onHide }: { message: string; show: boolean; onHide: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onHide, 1500);
    return () => clearTimeout(t);
  }, [show, onHide]);

  if (!show) return null;
  return (
    <div className="cut-in-overlay">
      <div className="cut-in-content">{message}</div>
    </div>
  );
}
