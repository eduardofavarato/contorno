import { getCountry } from '../countries/catalog';
import { isCorrectGuess, type Guess } from '../countries/guess';
import type { CountryId } from '../countries/types';
import { resolvePool, type Pool } from '../pool/pool';
import { shuffle, type Random } from '../random';
import { MAX_ATTEMPTS, pointsAfterWrongs, QUESTIONS_PER_GAME } from '../scoring';

export type IndividualOutcome = 'correct' | 'failed' | 'gave_up';

export interface IndividualResult {
  readonly countryId: CountryId;
  readonly outcome: IndividualOutcome;
  readonly wrongs: number;
  readonly points: number;
}

export interface IndividualState {
  readonly questions: readonly CountryId[];
  readonly index: number;
  readonly score: number;
  /** Wrong guesses on the current question. */
  readonly wrongs: number;
  /** `resolved`: the question is settled and waits for `next`. */
  readonly status: 'asking' | 'resolved' | 'finished';
  readonly results: readonly IndividualResult[];
}

export type IndividualEvent =
  { readonly type: 'guess'; readonly guess: Guess } | { readonly type: 'give_up' } | { readonly type: 'next' };

/** A whole continent is played end to end; any other pool is sampled. */
export function selectIndividualQuestions(pool: Pool, random: Random): CountryId[] {
  const ids = shuffle(resolvePool(pool), random).map((country) => country.id);
  return pool.kind === 'continent' ? ids : ids.slice(0, QUESTIONS_PER_GAME);
}

export function startIndividual(questions: readonly CountryId[]): IndividualState {
  if (questions.length === 0) throw new Error('An individual game needs at least one question');
  return { questions, index: 0, score: 0, wrongs: 0, status: 'asking', results: [] };
}

export function currentIndividualCountryId(state: IndividualState): CountryId {
  const id = state.questions[state.index];
  if (id === undefined) throw new Error('No current question');
  return id;
}

/** Points the current question is worth right now. */
export function currentIndividualPoints(state: IndividualState): number {
  return pointsAfterWrongs(state.wrongs);
}

export function individualReducer(state: IndividualState, event: IndividualEvent): IndividualState {
  switch (event.type) {
    case 'guess':
      return state.status === 'asking' ? guess(state, event.guess) : state;
    case 'give_up':
      return state.status === 'asking' ? settle(state, 'gave_up', 0) : state;
    case 'next':
      return state.status === 'resolved' ? advance(state) : state;
  }
}

function guess(state: IndividualState, attempt: Guess): IndividualState {
  if (isCorrectGuess(getCountry(currentIndividualCountryId(state)), attempt)) {
    return settle(state, 'correct', currentIndividualPoints(state));
  }
  const wrongs = state.wrongs + 1;
  return wrongs >= MAX_ATTEMPTS ? settle({ ...state, wrongs }, 'failed', 0) : { ...state, wrongs };
}

function settle(state: IndividualState, outcome: IndividualOutcome, points: number): IndividualState {
  const result: IndividualResult = {
    countryId: currentIndividualCountryId(state),
    outcome,
    wrongs: state.wrongs,
    points,
  };
  return { ...state, score: state.score + points, status: 'resolved', results: [...state.results, result] };
}

function advance(state: IndividualState): IndividualState {
  const index = state.index + 1;
  if (index >= state.questions.length) return { ...state, index, status: 'finished' };
  return { ...state, index, wrongs: 0, status: 'asking' };
}
