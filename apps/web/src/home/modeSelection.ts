import type { Continent, GameFormat, GameMode, GameSetup, Level } from '@contorno/core';
import type { GameRequest, Venue } from '../navigation/types';

/** What the player has picked on a mode's card before pressing play. */
export interface ModeSelection {
  readonly format: GameFormat;
  readonly level: Level;
  readonly continent: Continent;
}

export const DEFAULT_SELECTION: ModeSelection = { format: 'individual', level: 1, continent: 'south-america' };

export function toSetup(mode: GameMode, { level, continent }: ModeSelection): GameSetup {
  return mode === 'continentes'
    ? { mode, pool: { kind: 'continent', continent } }
    : { mode, pool: { kind: 'level', level } };
}

export function toRequest(mode: GameMode, selection: ModeSelection, venue: Venue = 'local'): GameRequest {
  const setup = toSetup(mode, selection);
  return selection.format === 'duel' ? { setup, format: 'duel', venue } : { setup, format: 'individual' };
}
