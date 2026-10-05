import { useEffect, useState } from 'react';

/** Often enough that the value frozen when the game ends is within a quarter of a second of the real time. */
const TICK_MS = 250;

/** Milliseconds since the component mounted, refreshed while `running`; frozen once it stops. */
export function useElapsed(running: boolean): number {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [running, startedAt]);

  return elapsed;
}
