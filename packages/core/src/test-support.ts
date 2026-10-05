import { getCountry } from './countries/catalog';
import type { CountryId } from './countries/types';
import type { Guess, Question } from './quiz/question';
import { worldQuestion } from './quiz/world';
import type { Random } from './random';

/** Small deterministic PRNG (mulberry32) so shuffles are reproducible in tests. */
export function seededRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const typed = (value: string): Guess => ({ type: 'text', value });
export const clicked = (id: number): Guess => ({ type: 'region', id });

export const BRASIL = 76;
export const ARGENTINA = 32;
export const CHILE = 152;

/** A country as a question where the player types its name. */
export const typedQuestion = (id: CountryId): Question => worldQuestion(getCountry(id), 'type');

/** A country as a question where the player clicks it by name. */
export const clickQuestion = (id: CountryId): Question => worldQuestion(getCountry(id), 'click');
