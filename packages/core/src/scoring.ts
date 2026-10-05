export const MAX_POINTS = 2000;
export const WRONG_GUESS_PENALTY = 200;
export const MAX_ATTEMPTS = 3;
export const STEAL_POINTS = 1000;
/** Countries asked per game when the pool is not a whole continent. */
export const QUESTIONS_PER_GAME = 10;

/** Points still available for a country after `wrongs` failed attempts (individual format). */
export function pointsAfterWrongs(wrongs: number): number {
  return Math.max(0, MAX_POINTS - wrongs * WRONG_GUESS_PENALTY);
}
