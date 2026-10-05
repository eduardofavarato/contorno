import { BRASIL_TOPICS } from '../brasil/topics';
import { CONTINENT_IDS } from '../countries/continents';
import type { Level } from '../countries/types';
import type { GameSetup } from '../modes';

/**
 * Identifies one ranking: the same mode with the same pool, e.g. `perguntas:level:1`, `continentes:continent:europe`
 * or `brasil:brasil:capitais`. Scores are only comparable inside a board.
 */
export type BoardKey = string;

const LEVELS: readonly Level[] = [1, 2, 3];

export function boardKeyFor(setup: GameSetup): BoardKey {
  switch (setup.pool.kind) {
    case 'level':
      return `${setup.mode}:level:${String(setup.pool.level)}`;
    case 'continent':
      return `${setup.mode}:continent:${setup.pool.continent}`;
    case 'brasil':
      return `${setup.mode}:brasil:${setup.pool.topic}`;
  }
}

/** Every board there is, in the order the ranking screen lists them. */
export const ALL_BOARDS: readonly GameSetup[] = [
  ...LEVELS.map((level): GameSetup => ({ mode: 'perguntas', pool: { kind: 'level', level } })),
  ...CONTINENT_IDS.map((continent): GameSetup => ({ mode: 'continentes', pool: { kind: 'continent', continent } })),
  ...LEVELS.map((level): GameSetup => ({ mode: 'localizar', pool: { kind: 'level', level } })),
  ...BRASIL_TOPICS.map((topic): GameSetup => ({ mode: 'brasil', pool: { kind: 'brasil', topic } })),
];

const BOARDS_BY_KEY: ReadonlyMap<BoardKey, GameSetup> = new Map(ALL_BOARDS.map((setup) => [boardKeyFor(setup), setup]));

/** The setup behind a board key, or `null` when the key is not a real board. */
export function setupForBoard(key: string): GameSetup | null {
  return BOARDS_BY_KEY.get(key) ?? null;
}
