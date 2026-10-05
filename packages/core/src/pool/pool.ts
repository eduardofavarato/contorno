import type { BrasilTopic } from '../brasil/topics';
import type { Continent } from '../countries/continents';
import type { Level } from '../countries/types';

/** Where a game's countries come from: a difficulty level or a whole continent. */
export interface LevelPool {
  readonly kind: 'level';
  readonly level: Level;
}

/** The Especial Brasil mode has one pool per topic: states, capitals or cities. */
export interface BrasilPool {
  readonly kind: 'brasil';
  readonly topic: BrasilTopic;
}

export interface ContinentPool {
  readonly kind: 'continent';
  readonly continent: Continent;
}
