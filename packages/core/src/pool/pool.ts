import { countriesForContinent, countriesForLevel } from '../countries/catalog';
import type { Continent } from '../countries/continents';
import type { Country, Level } from '../countries/types';

/** Where a game's countries come from: a difficulty level or a whole continent. */
export interface LevelPool {
  readonly kind: 'level';
  readonly level: Level;
}

export interface ContinentPool {
  readonly kind: 'continent';
  readonly continent: Continent;
}

export type Pool = LevelPool | ContinentPool;

export function resolvePool(pool: Pool): readonly Country[] {
  return pool.kind === 'level' ? countriesForLevel(pool.level) : countriesForContinent(pool.continent);
}
