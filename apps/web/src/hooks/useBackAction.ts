import { useEffect, useRef } from 'react';
import { pushBackAction, type BackAction } from '../native/backStack';

/**
 * Makes the system back button (Android app) run `action` while this component is mounted and `enabled`.
 * The latest `action` is always the one run, so callers need not memoize it.
 */
export function useBackAction(action: BackAction, enabled = true): void {
  const latest = useRef(action);
  useEffect(() => {
    latest.current = action;
  });

  useEffect(() => {
    if (!enabled) return;
    return pushBackAction(() => {
      latest.current();
    });
  }, [enabled]);
}
