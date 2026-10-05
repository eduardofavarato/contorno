import type { GameRequest } from '../navigation/types';
import { DuelGame } from './duel/DuelGame';
import { IndividualGame } from './individual/IndividualGame';
import { OnlineDuel } from '../online/OnlineDuel';

interface GameScreenProps {
  readonly request: GameRequest;
  readonly onQuit: () => void;
  readonly onPlayAgain: () => void;
}

/** Picks the game that matches the player's choice of format and venue. */
export function GameScreen({ request, onQuit, onPlayAgain }: GameScreenProps) {
  if (request.format === 'individual') {
    return <IndividualGame setup={request.setup} onQuit={onQuit} onPlayAgain={onPlayAgain} />;
  }
  return request.venue === 'local' ? (
    <DuelGame setup={request.setup} onQuit={onQuit} onPlayAgain={onPlayAgain} />
  ) : (
    <OnlineDuel setup={request.setup} onQuit={onQuit} />
  );
}
