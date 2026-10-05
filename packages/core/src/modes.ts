import type { ContinentPool, LevelPool } from './pool/pool';

/** How the player answers: typing the country's name or clicking it on the map. */
export type Challenge = 'type' | 'click';

/** Who plays: one person alone, or two competing. */
export type GameFormat = 'individual' | 'duel';

/** Each mode pairs a challenge with a kind of pool; the type system keeps the pairing valid. */
export type GameSetup =
  | { readonly mode: 'perguntas'; readonly pool: LevelPool }
  | { readonly mode: 'continentes'; readonly pool: ContinentPool }
  | { readonly mode: 'localizar'; readonly pool: LevelPool };

export type GameMode = GameSetup['mode'];

const CHALLENGES: Record<GameMode, Challenge> = {
  perguntas: 'type',
  continentes: 'type',
  localizar: 'click',
};

export function challengeFor(mode: GameMode): Challenge {
  return CHALLENGES[mode];
}
