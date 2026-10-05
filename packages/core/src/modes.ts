import { brasilChallenge } from './brasil/topics';
import type { BrasilPool, ContinentPool, LevelPool } from './pool/pool';
import type { Challenge } from './quiz/question';
import type { MapKind } from './quiz/quiz';

export type { Challenge };

/** Who plays: one person alone, or two competing. */
export type GameFormat = 'individual' | 'duel';

/** Each mode pairs with a kind of pool; the type system keeps the pairing valid. */
export type GameSetup =
  | { readonly mode: 'perguntas'; readonly pool: LevelPool }
  | { readonly mode: 'continentes'; readonly pool: ContinentPool }
  | { readonly mode: 'localizar'; readonly pool: LevelPool }
  | { readonly mode: 'brasil'; readonly pool: BrasilPool };

export type GameMode = GameSetup['mode'];

/** Which map a setup is played on. */
export function mapFor(setup: GameSetup): MapKind {
  return setup.mode === 'brasil' ? 'brasil' : 'world';
}

/** How the player answers in this setup: Localizar and Brazilian cities click, everything else types. */
export function challengeFor(setup: GameSetup): Challenge {
  if (setup.mode === 'brasil') return brasilChallenge(setup.pool.topic);
  return setup.mode === 'localizar' ? 'click' : 'type';
}
