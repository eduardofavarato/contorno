import type { GameSetup } from '@contorno/core';
import { useState } from 'react';
import { OnlineLobby } from './OnlineLobby';
import { OnlineMatch } from './OnlineMatch';
import type { Intent } from './session';

interface OnlineDuelProps {
  readonly setup: GameSetup;
  readonly onQuit: () => void;
}

/** Online duel flow: lobby (create or join a room), then the match; leaving a match returns to the lobby. */
export function OnlineDuel({ setup, onQuit }: OnlineDuelProps) {
  const [intent, setIntent] = useState<Intent | null>(null);

  if (!intent) {
    return (
      <OnlineLobby
        setup={setup}
        onCreate={() => {
          setIntent({ type: 'create', setup });
        }}
        onJoin={(room) => {
          setIntent({ type: 'join', room });
        }}
        onBack={onQuit}
      />
    );
  }
  return (
    <OnlineMatch
      intent={intent}
      onLeave={() => {
        setIntent(null);
      }}
      onHome={onQuit}
    />
  );
}
