import { useCallback, useEffect, useRef, useState } from 'react';

/** A value that shows up for a moment and clears itself, e.g. the red blink of a wrong guess. */
export function useTransient<T>(): [T | null, (value: T, durationMs: number) => void] {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((next: T, durationMs: number) => {
    clearTimeout(timer.current);
    setValue(next);
    timer.current = setTimeout(() => {
      setValue(null);
    }, durationMs);
  }, []);

  return [value, show];
}
