import { findCountry, getCountry } from '../countries/catalog';
import { isCorrectGuess } from '../countries/guess';
import type { CountryId } from '../countries/types';
import { normalize } from '../text/normalize';

export interface FreeAnswer {
  readonly correct: boolean;
  /** What the player typed, as typed. */
  readonly attempt: string;
}

/** Modo Livre: pick any country on the map and name it; each country is answered at most once. */
export interface FreeState {
  readonly selected: CountryId | null;
  readonly answers: ReadonlyMap<CountryId, FreeAnswer>;
}

export type FreeEvent =
  { readonly type: 'select'; readonly id: CountryId } | { readonly type: 'answer'; readonly text: string };

export function startFree(): FreeState {
  return { selected: null, answers: new Map() };
}

export function freeStats(state: FreeState): { readonly correct: number; readonly total: number } {
  const answers = [...state.answers.values()];
  return { correct: answers.filter((answer) => answer.correct).length, total: answers.length };
}

export function freeReducer(state: FreeState, event: FreeEvent): FreeState {
  switch (event.type) {
    case 'select':
      // Already answered or not part of the quiz: the pick is ignored.
      return findCountry(event.id) && !state.answers.has(event.id) ? { ...state, selected: event.id } : state;
    case 'answer': {
      if (state.selected === null || normalize(event.text) === '') return state;
      const answer: FreeAnswer = {
        correct: isCorrectGuess(getCountry(state.selected), { type: 'text', value: event.text }),
        attempt: event.text.trim(),
      };
      return { selected: null, answers: new Map(state.answers).set(state.selected, answer) };
    }
  }
}
