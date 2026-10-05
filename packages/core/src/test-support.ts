import type { Guess } from './countries/guess';
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
export const clicked = (id: number): Guess => ({ type: 'country', id });

export const BRASIL = 76;
export const ARGENTINA = 32;
export const CHILE = 152;
