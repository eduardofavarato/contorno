import { useEffect, useState, useSyncExternalStore } from 'react';
import { OnlineSession, websocketUrl, type Intent, type SessionState } from './session';

export interface OnlineSessionHandle {
  readonly state: SessionState;
  readonly guess: OnlineSession['guess'];
  readonly giveUp: OnlineSession['giveUp'];
}

/** Connects when mounted and disconnects when unmounted. `intent` must not change while mounted. */
export function useOnlineSession(intent: Intent): OnlineSessionHandle {
  const [session] = useState(() => new OnlineSession(websocketUrl(window.location)));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);

  useEffect(() => {
    session.start(intent);
    return () => {
      session.close();
    };
    // The intent is fixed for the life of a session screen, which is remounted to try another one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return {
    state,
    guess: (guess) => {
      session.guess(guess);
    },
    giveUp: () => {
      session.giveUp();
    },
  };
}
