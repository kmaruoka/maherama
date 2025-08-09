import { useCallback, useEffect, useRef, useState } from 'react';

export function useMeasureContainer<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onResize = useCallback((entry: ResizeObserverEntry) => {
    const cr = entry.contentRect;
    setSize({ width: cr.width, height: cr.height });
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => entries.forEach(onResize));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [onResize]);

  return { ref, size };
}
