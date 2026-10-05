import { normalize } from '../text/normalize';
import type { Country, CountryId } from './types';

/** A player's attempt: a typed name (Perguntas, Continentes) or a clicked country (Localizar). */
export type Guess =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'country'; readonly id: CountryId };

export function isCorrectGuess(target: Country, guess: Guess): boolean {
  if (guess.type === 'country') return guess.id === target.id;
  const typed = normalize(guess.value);
  return target.aliases.some((alias) => normalize(alias) === typed);
}
