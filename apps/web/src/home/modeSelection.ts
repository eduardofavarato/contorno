import type { BrasilTopic, Continent, GameFormat, GameMode, GameSetup, Level } from '@contorno/core';
import type { GameRequest, Venue } from '../navigation/types';

/** What the player has picked on a mode's card before pressing play. */
export interface ModeSelection {
  readonly format: GameFormat;
  readonly level: Level;
  readonly continent: Continent;
  readonly topic: BrasilTopic;
}

export const DEFAULT_SELECTION: ModeSelection = {
  format: 'individual',
  level: 1,
  continent: 'south-america',
  topic: 'estados',
};

export function toSetup(mode: GameMode, { level, continent, topic }: ModeSelection): GameSetup {
  switch (mode) {
    case 'continentes':
      return { mode, pool: { kind: 'continent', continent } };
    case 'brasil':
      return { mode, pool: { kind: 'brasil', topic } };
    case 'perguntas':
    case 'localizar':
      return { mode, pool: { kind: 'level', level } };
  }
}

export function toRequest(mode: GameMode, selection: ModeSelection, venue: Venue = 'local'): GameRequest {
  const setup = toSetup(mode, selection);
  return selection.format === 'duel' ? { setup, format: 'duel', venue } : { setup, format: 'individual' };
}
