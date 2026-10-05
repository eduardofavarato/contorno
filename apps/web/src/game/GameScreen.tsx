import type { GameSetup } from '@contorno/core';
import type { GameRequest } from '../navigation/types';
import { DuelGame } from './duel/DuelGame';
import { IndividualFlow } from './individual/IndividualFlow';
import { OnlineDuel } from '../online/OnlineDuel';

interface GameScreenProps {
  readonly request: GameRequest;
  readonly onQuit: () => void;
  readonly onPlayAgain: () => void;
  readonly onLogin: () => void;
  readonly onOpenRanking: (setup: GameSetup) => void;
}

/** Picks the game that matches the player's choice of format and venue. */
export function GameScreen({ request, onQuit, onPlayAgain, onLogin, onOpenRanking }: GameScreenProps) {
  if (request.format === 'individual') {
    return (
      <IndividualFlow
        setup={request.setup}
        onQuit={onQuit}
        onPlayAgain={onPlayAgain}
        onLogin={onLogin}
        onOpenRanking={onOpenRanking}
      />
    );
  }
  return request.venue === 'local' ? (
    <DuelGame setup={request.setup} onQuit={onQuit} onPlayAgain={onPlayAgain} />
  ) : (
    <OnlineDuel setup={request.setup} onQuit={onQuit} />
  );
}
