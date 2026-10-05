import { useEffect, useState, type RefObject } from 'react';
import type { MapSize } from './layout';

/** Tracks an element's content box; `null` until it has been measured and has an area. */
export function useElementSize(ref: RefObject<HTMLElement | null>): MapSize | null {
  const [size, setSize] = useState<MapSize | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((previous) => (previous?.width === width && previous.height === height ? previous : { width, height }));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size && size.width > 0 && size.height > 0 ? size : null;
}
